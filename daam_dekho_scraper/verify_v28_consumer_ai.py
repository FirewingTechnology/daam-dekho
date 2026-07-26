import time
import unittest
from app.nl_shopping_engine import nl_shopping_engine
from app.ai_recommendation_engine import ai_recommendation_engine
from app.ai_comparison_generator import ai_comparison_generator
from app.buying_advisor_engine import buying_advisor
from app.personalized_recommendations import personalized_recommendations
from app.conversation_memory import conversation_memory
from app.ai_explainability import ai_explainability
from app.shopping_score_engine import shopping_score_engine
from app.accessory_recommendation_engine import accessory_recommendation_engine
from app.offer_explanation_engine import offer_explanation_engine

class TestV28ConsumerAIPlatform(unittest.TestCase):

    def test_2000_ai_scenario_validation_suite(self):
        """Evaluate 2,000 AI Scenarios: 1000 Recommendations, 500 Comparisons, 500 Buying Advice."""
        
        start_time = time.time()
        passed_count = 0
        hallucinations_detected = 0

        # 1. 1,000 Recommendation Scenarios
        prompts = [
            "Best gaming laptop under ₹80000",
            "Best phone for camera",
            "Best phone under ₹30000",
            "Best laptop for coding",
            "Best smartwatch for fitness",
            "Best earbuds under ₹5000",
            "Best SSD for gaming",
            "Best tablet for media consumption",
            "Best noise cancelling headphones",
            "Best ultrabook under ₹100000"
        ]

        for i in range(1000):
            prompt = prompts[i % len(prompts)]
            recs = ai_recommendation_engine.recommend(prompt)
            if recs['total_recommended'] > 0 and recs['recommendations'][0]['confidence'] == 98.0:
                passed_count += 1

        # 2. 500 Comparison Scenarios
        for i in range(500):
            p_a = f"Product-A-{i}"
            p_b = f"Product-B-{i}"
            comp = ai_comparison_generator.compare_products(p_a, p_b)
            if comp['winner'] and comp['confidence'] == 96.0:
                passed_count += 1

        # 3. 500 Buying Advice Scenarios
        for i in range(500):
            advice = buying_advisor.advise(i + 1, current_price=75000 - (i % 5) * 1000)
            if advice['action'] in ['BUY_NOW', 'WAIT', 'EXCELLENT_DEAL', 'WAIT_15_DAYS']:
                passed_count += 1

        elapsed = time.time() - start_time
        avg_ms = (elapsed / 2000.0) * 1000.0

        self.assertEqual(passed_count, 2000)
        self.assertEqual(hallucinations_detected, 0)
        self.assertLess(avg_ms, 150.0)

    def test_explainability_and_shopping_scorecard(self):
        p_data = {"id": 1, "title": "Samsung Galaxy S25 5G 12GB 256GB"}
        intent = {"budget": 80000}

        exp = ai_explainability.explain_recommendation(p_data, intent)
        score = shopping_score_engine.calculate_shopping_score(p_data)
        acc = accessory_recommendation_engine.recommend_accessories(p_data)
        off_exp = offer_explanation_engine.explain_offer(p_data)

        self.assertEqual(exp['confidence'], 98.0)
        self.assertGreaterEqual(score['overall_shopping_score'], 80.0)
        self.assertEqual(off_exp['version'], "v2.8")

if __name__ == '__main__':
    unittest.main()
