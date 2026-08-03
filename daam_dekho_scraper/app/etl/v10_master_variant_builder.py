from typing import Dict, Any, List, Tuple
from app.logger import get_logger
from app.database.manager import db_manager
from app.etl.v10_canonicalization import canonical_title_engine
from app.etl.v10_identity_generator import identity_generator_engine

logger = get_logger("v10_master_variant_builder")

class MasterAndVariantBuilderEngine:
    """PHASE 5 & 6: DaamDekho v10.0 Master Product & Variant Builder.
    Creates parent Master Products (Phase 5) and distinct hardware Variants (Phase 6)
    in Layer 3 Catalog schema based on deterministic SHA-256 identity hashes.
    """

    def build_master_and_variants(self, normalized_ids: List[int], default_category: str = "Mobiles") -> List[Tuple[int, int, int]]:
        conn = db_manager.get_connection()
        cursor = conn.cursor()

        results = []

        for n_id in normalized_ids:
            cursor.execute("""
                SELECT np.canonical_brand, np.canonical_series, np.canonical_model, np.mpn, np.model_number, np.ean, np.upc, np.sku,
                       ns.clean_cpu, ns.clean_gpu, ns.clean_ram, ns.clean_storage, ns.clean_display, ns.clean_color, ns.clean_network,
                       ni.image_url
                FROM normalized_products np
                LEFT JOIN normalized_specs ns ON np.id = ns.normalized_product_id
                LEFT JOIN normalized_images ni ON np.id = ni.normalized_product_id AND ni.is_hero = 1
                WHERE np.id = ?
            """, (n_id,))
            row = cursor.fetchone()
            if not row:
                cursor.execute("""
                    SELECT ne.canonical_brand, ne.canonical_series, ne.canonical_model, NULL, NULL, NULL, NULL, NULL,
                           ne.clean_cpu, ne.clean_gpu, ne.clean_ram, ne.clean_storage, ne.clean_display, ne.clean_color, '5G',
                           rp.hero_image_url
                    FROM normalized_entities_v10 ne
                    JOIN raw_products_v10 rp ON ne.raw_product_id = rp.id
                    WHERE ne.id = ?
                """, (n_id,))
                row = cursor.fetchone()
                if not row:
                    continue

            c_brand, c_series, c_model, mpn, model_num, ean, upc, sku, c_cpu, c_gpu, c_ram, c_storage, c_disp, c_color, c_net, hero_img = row

            # Phase 7 SHA-256 Identity Hashes
            master_hash = identity_generator_engine.generate_master_identity_hash(
                brand=c_brand, series=c_series, model=c_model, mpn=mpn, model_number=model_num
            )
            variant_hash = identity_generator_engine.generate_variant_identity_hash(
                master_hash=master_hash, brand=c_brand, series=c_series, model=c_model,
                ram=c_ram, storage=c_storage, cpu=c_cpu, gpu=c_gpu, display=c_disp, network=c_net, color=c_color,
                mpn=mpn, model_number=model_num, ean=ean, upc=upc, sku=sku
            )

            # Phase 4 Canonical Master & Variant Titles
            master_title = canonical_title_engine.generate_canonical_master_title(c_brand, c_series, c_model)
            variant_title = canonical_title_engine.generate_canonical_variant_title(master_title, c_ram, c_storage, c_color)

            # Phase 5: Upsert Master Product in Layer 3 (master_products)
            cursor.execute("SELECT id FROM master_products WHERE master_identity_hash = ?", (master_hash,))
            mp_row = cursor.fetchone()
            if mp_row:
                master_id = mp_row[0]
                cursor.execute("UPDATE master_products SET canonical_title = ?, base_image = COALESCE(base_image, ?) WHERE id = ?", (master_title, hero_img, master_id))
            else:
                cursor.execute("""
                    INSERT INTO master_products (master_identity_hash, canonical_title, brand, series, model, category, base_image)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (master_hash, master_title, c_brand, c_series, c_model, default_category, hero_img))
                master_id = cursor.lastrowid

            # Mirror to master_products_v10 & products_master
            cursor.execute("SELECT id FROM master_products_v10 WHERE master_identity_hash = ?", (master_hash,))
            if cursor.fetchone():
                cursor.execute("UPDATE master_products_v10 SET canonical_title = ? WHERE master_identity_hash = ?", (master_title, master_hash))
            else:
                cursor.execute("""
                    INSERT INTO master_products_v10 (master_identity_hash, canonical_title, brand, series, model, base_image, category)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (master_hash, master_title, c_brand, c_series, c_model, hero_img, default_category))

            cursor.execute("SELECT id FROM products_master WHERE master_identity = ?", (master_hash,))
            if cursor.fetchone():
                cursor.execute("UPDATE products_master SET canonical_title = ? WHERE master_identity = ?", (master_title, master_hash))
            else:
                cursor.execute("""
                    INSERT INTO products_master (title, clean_title, normalized_title, canonical_title, brand, category, base_image, master_identity)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (master_title, master_title, master_title, master_title, c_brand, default_category, hero_img, master_hash))

            # Phase 6: Upsert Hardware Variant in Layer 3 (product_variants)
            cursor.execute("SELECT id FROM product_variants WHERE variant_identity_hash = ?", (variant_hash,))
            pv_row = cursor.fetchone()
            if pv_row:
                variant_id = pv_row[0]
                cursor.execute("""
                    UPDATE product_variants
                    SET cpu = ?, ram = ?, storage = ?, color = ?
                    WHERE id = ?
                """, (c_cpu, c_ram, c_storage, c_color or 'Default', variant_id))
            else:
                cursor.execute("""
                    INSERT INTO product_variants (
                        master_product_id, product_id, variant_identity_hash, mpn, model_number, ean, upc, sku, cpu, gpu, ram, storage, display_size, color, network
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (master_id, master_id, variant_hash, mpn, model_num, ean, upc, sku, c_cpu, c_gpu, c_ram, c_storage, c_disp, c_color or 'Default', c_net or '5G'))
                variant_id = cursor.lastrowid

            # Mirror to product_variants_v10
            cursor.execute("SELECT id FROM product_variants_v10 WHERE variant_identity_hash = ?", (variant_hash,))
            if cursor.fetchone():
                cursor.execute("UPDATE product_variants_v10 SET ram = ?, storage = ? WHERE variant_identity_hash = ?", (c_ram, c_storage, variant_hash))
            else:
                cursor.execute("""
                    INSERT INTO product_variants_v10 (master_product_id, variant_identity_hash, cpu, gpu, ram, storage, display_size, color)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (master_id, variant_hash, c_cpu, c_gpu, c_ram, c_storage, c_disp, c_color or 'Default'))

            # Insert variant specs into Layer 3 (variant_specifications) & product_specifications
            specs_map = {
                "Brand": c_brand, "Series": c_series, "Model": c_model,
                "RAM": c_ram, "Storage": c_storage, "CPU": c_cpu, "GPU": c_gpu,
                "Display": c_disp, "Color": c_color, "Network": c_net
            }
            for k, v in specs_map.items():
                if v:
                    cursor.execute("""
                        INSERT INTO variant_specifications (variant_id, spec_key, spec_value)
                        VALUES (?, ?, ?)
                    """, (variant_id, k, str(v)))
                    cursor.execute("""
                        INSERT OR REPLACE INTO product_specifications (variant_id, spec_key, spec_value)
                        VALUES (?, ?, ?)
                    """, (variant_id, k, str(v)))

            # Insert variant image into Layer 3 (variant_images)
            if hero_img:
                cursor.execute("""
                    INSERT INTO variant_images (variant_id, image_url, is_primary)
                    VALUES (?, ?, 1)
                """, (variant_id, hero_img))

            results.append((n_id, master_id, variant_id))

        conn.commit()
        conn.close()

        logger.info(f"✅ [PHASE 5 & 6 COMPLETED] Processed {len(results)} normalized entities into Master Products & Variants.")
        return results

master_variant_builder_engine = MasterAndVariantBuilderEngine()
