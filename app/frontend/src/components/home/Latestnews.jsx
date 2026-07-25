import React, { useState } from "react";
import { FaUser, FaRegCalendarAlt, FaEye } from "react-icons/fa";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { writWatchIMg } from "../../assets/ImportImages";

const NewsCard = ({ author, views, image, selectedDate, onDateChange }) => (
  <div className="w-full sm:w-[48%] lg:w-[31%] bg-white rounded-md shadow-md overflow-hidden border border-gray-200">
    <img src={image} alt="Blog" className="w-full p-5 h-60 object-cover" />

    <div className="p-4">
      <div className="flex items-center text-sm text-gray-500 mb-2 flex-wrap gap-x-4 gap-y-2">
        <div className="flex items-center gap-1">
          <FaUser className="w-4 h-4" />
          <span>{author}</span>
        </div>
        <div className="flex items-center gap-1">
          <FaRegCalendarAlt className="w-4 h-4" />
          <DatePicker
            selected={selectedDate}
            onChange={onDateChange}
            dateFormat="dd MMM, yyyy"
            className="bg-transparent outline-none text-gray-600 w-28"
          />
        </div>
        <div className="flex items-center gap-1">
          <FaEye className="w-4 h-4" />
          <span>{views}</span>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-800 leading-snug mb-2">
        Praesent fringilla erat a lacinia egestas donec vehicula tempor libero
        et cursus.
      </h3>

      <p className="text-sm text-gray-600 mb-4">
        Suspendisse iaculis, mi nec suscipit aliquet, ante lectus eleifend dui,
        in viverra magna purus ac dia suspendisse potenti acenas ornare.
      </p>

      <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#dcfe50] text-black rounded-md text-sm font-medium hover:bg-lime-500 transition">
        READ MORE
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </div>
);

const Latestnews = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  return (
    <div className=" bg-gray-100  py-10 px-4 md:px-8">
      <div className="maxscreen screen-margin">
        <div className="text-center font-bold text-2xl md:text-3xl mb-10">
          <h2>Latest News</h2>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          <NewsCard
            author="Kevin"
            views={617}
            image={writWatchIMg}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
          <NewsCard
            author="Kevin"
            views={617}
            image={writWatchIMg}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
          <NewsCard
            author="Kevin"
            views={617}
            image={writWatchIMg}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </div>
      </div>
    </div>
  );
};

export default Latestnews;
