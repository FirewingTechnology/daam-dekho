import React from "react";
import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";

const RatingStars = ({ rating = 0, reviews = null }) => {
  // Ensure rating is always a number between 0 and 5
  const parsedRating = Number(rating) || 0;
  const safeRating = Math.max(0, Math.min(5, parsedRating));

  const fullStars = Math.floor(safeRating);
  const hasHalfStar = safeRating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  const stars = [
    ...Array(fullStars).fill(<FaStar className="text-yellow-500" />),
    ...(hasHalfStar ? [<FaStarHalfAlt className="text-yellow-500" />] : []),
    ...Array(emptyStars).fill(<FaRegStar className="text-yellow-500" />),
  ];

  return (
    <div className="flex flex-wrap items-center space-x-1 text-xs my-1">
      {stars.map((star, idx) => (
        <span key={idx}>{star}</span>
      ))}
      {reviews !== null && (
        <span className="text-gray-500 ml-1">({reviews})</span>
      )}
      {/* Optional: show numeric rating */}
      <span className="ml-1 text-gray-600">{safeRating.toFixed(1)}</span>
    </div>
  );
};

export default RatingStars;
