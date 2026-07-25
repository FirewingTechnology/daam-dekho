import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useState } from "react";
import { apiEndpoints } from "../services/api";
import { toast } from "react-toastify";

function ContactUs() {
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);

  const validationSchema = yup.object().shape({
    name: yup.string().required("Name is required."),
    email: yup
      .string()
      .email("Invalid email address.")
      .required("Email is required."),
    phone: yup
      .string()
      .matches(/^\d*$/, "Phone number must contain only digits.")
      .max(10, "Phone number must not exceed 10 digits.")
      .nullable(),
    message: yup.string().required("Message is required."),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
    },
  });

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const response = await apiEndpoints.submitContact(data);
      console.log("API Response:", response.data);

      // Show success popup and toast
      setShowPopup(true);
      toast.success("Message sent successfully!");
      reset();
    } catch (error) {
      console.error("API Error:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full pt-8  ">
      {/* Contact Form Section */}
      <section className="maxscreen screen-margin overflow-hidden">
        <div className="">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-gray-800 w-full py-15">
            Get in touch with us. We're here
            <br /> to assist you.
          </h2>
        </div>

        <div className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
          <div className="w-full bg-white shadow-md rounded border border-gray-300 p-4 sm:p-6 md:p-10">
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <input
                    type="text"
                    placeholder="Your Name"
                    {...register("name")}
                    className="border-b border-gray-300 text-black font-semibold outline-none py-2 px-2 w-full"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Email Address"
                    {...register("email")}
                    className="border-b border-gray-300 text-black font-semibold outline-none py-2 px-2 w-full"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Phone Number (optional)"
                    {...register("phone")}
                    className="border-b border-gray-300 text-black font-semibold outline-none py-2 px-2 w-full"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <textarea
                  placeholder="Your Message"
                  {...register("message")}
                  rows={4}
                  className="w-full border-b border-gray-300 text-black font-semibold outline-none py-2 px-2 resize-none"
                />
                {errors.message && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.message.message}
                  </p>
                )}
              </div>

              <div className="overflow-x-auto">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#dcfe50] hover:bg-lime-500 text-black px-6 py-2 rounded text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Leave Us A Message →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Contact Info Section */}
      <section className="w-full bg-[#dcfe50] ">
        <div className="maxscreen screen-margin overflow-hidden p-6 md:p-12 ">
          <div className="flex flex-col gap-8 md:flex-row md:justify-between md:items-start flex-wrap overflow-auto">
            <div className="flex-1 min-w-[220px]">
              <h2 className="font-semibold text-base md:text-lg">
                Contact Info
              </h2>
              <h1 className="font-bold text-xl md:text-[28px]">
                We are always happy to assist you
              </h1>
            </div>

            <div className="flex-1 min-w-[220px]">
              <h2 className="font-semibold text-base md:text-lg">Email</h2>
              <h2 className="font-semibold text-sm md:text-base">
                Help@info.com
              </h2>
              <h6 className="text-xs md:text-sm">
                Assistance Hours: Monday To Friday 6am to 8pm EST
              </h6>
            </div>

            <div className="flex-1 min-w-[220px]">
              <h2 className="font-semibold text-base md:text-lg">Mobile</h2>
              <h2 className="font-semibold text-sm md:text-base">
                (808) 998-34256
              </h2>
              <h6 className="text-xs md:text-sm">
                Assistance Hours: Monday To Friday 6am to 8pm EST
              </h6>
            </div>
          </div>
        </div>
      </section>

      {/* Popup Modal */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/390 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-80 text-center relative">
            <h2 className="text-lg font-semibold mb-4">
              Form Submitted Successfully!
            </h2>
            <p className="text-sm text-gray-700 mb-6">
              Thank you for contacting us. We will get back to you soon.
            </p>
            <button
              onClick={() => setShowPopup(false)}
              className="bg-[#dcfe50] hover:bg-lime-500 px-4 py-2 rounded text-sm font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContactUs;
