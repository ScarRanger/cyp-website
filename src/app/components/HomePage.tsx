'use client';

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { FaInstagram, FaYoutube } from "react-icons/fa";

const images = [
    "bangloreputreach.jpeg",
    "beachfellowship.jpeg",
    "borivalioutreach.jpeg",
    "camp2025.jpg",
    "christmasfellowship.jpeg",
    "feb_recollection.jpeg",
    "fellowship.jpeg",
    "k24.jpeg",
    "nvrecollec.jpeg",
    "orpahnagenv.jpeg",
    "soprts.jpeg",
];

const imageInfo = [
    "Bangalore Outreach",
    "Beach Fellowship",
    "Borivali Outreach",
    "Camp 2025",
    "Christmas Fellowship",
    "February Recollection",
    "Fellowship",
    "K24",
    "NV Recollection",
    "Orphanage NV",
    "Sports",
];

export default function AboutSection() {
    const [current, setCurrent] = useState(0);
    const total = images.length;
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const prev = () => setCurrent((current - 1 + total) % total);
    const next = () => setCurrent((current + 1) % total);

    useEffect(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setCurrent((c) => (c + 1) % total);
        }, 7000);
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [current, total]);

    return (
        <section className="w-full flex justify-center py-12 px-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-5xl flex flex-col items-center space-y-12">

                {/* --- Carousel Section --- */}
                <div className="w-full flex flex-col items-center">
                    <h2 className="text-3xl font-bold text-yellow-500 text-center mb-2">
                        Our Events
                    </h2>
                    <div className="w-full border-b-2 border-yellow-400 mb-8"></div>

                    <div className="relative w-full max-w-xl flex items-center justify-center mb-6 h-64 sm:h-80">
                        <button
                            onClick={prev}
                            className="absolute left-0 top-1/2 -translate-y-1/2 bg-blue-400 text-white rounded-lg p-4 shadow hover:bg-blue-500 transition z-10"
                            aria-label="Previous"
                        >
                            <span className="text-2xl">&#x2039;</span>
                        </button>

                        <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-xl shadow-lg bg-white relative transition-all duration-700 ease-in-out">
                            <Image
                                src={`/${images[current]}`}
                                alt={imageInfo[current]}
                                width={400}
                                height={256}
                                className="object-cover w-full h-full"
                                priority
                            />
                        </div>

                        <button
                            onClick={next}
                            className="absolute right-0 top-1/2 -translate-y-1/2 bg-blue-400 text-white rounded-lg p-4 shadow hover:bg-blue-500 transition z-10"
                            aria-label="Next"
                        >
                            <span className="text-2xl">&#x203A;</span>
                        </button>
                    </div>

                    <div className="text-center text-gray-700 text-xl font-medium mb-4">
                        {imageInfo[current]}
                    </div>

                    <div className="flex gap-2 mt-2 justify-center">
                        {images.map((_, idx) => (
                            <button
                                key={idx}
                                className={`w-3 h-3 rounded-full ${idx === current ? "bg-yellow-500" : "bg-gray-300"
                                    }`}
                                onClick={() => setCurrent(idx)}
                                aria-label={`Go to slide ${idx + 1}`}
                            />
                        ))}
                    </div>
                </div>

                {/* --- Who We Are Section --- */}
                <div className="w-full flex flex-col items-center">
                    <h2 className="text-3xl font-bold text-yellow-500 text-center mb-2">
                        Who We Are
                    </h2>
                    <div className="w-full border-b-2 border-yellow-400 mb-8"></div>

                    <p className="text-gray-700 text-center mb-4">
                        Christian Youth in Power (CYP) is the Youth Outreach of The Community of
                        the Good Shepherd — a covenanted SOS community.
                    </p>
                    <p className="text-gray-700 text-center mb-6">
                        CYP is a movement of Christian youth, both students and working youth who
                        aspire to be and make disciples of Our Lord and Saviour, Jesus Christ. We
                        seek to evangelize and train them to be future leaders in the ‘Power of
                        the Holy Spirit’ for the service of the Church and society.
                    </p>

                    <div className="w-full flex justify-center">
                        <iframe
                            width="560"
                            height="315"
                            src="https://www.youtube.com/embed/5I7pDz0WHlk"
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="rounded-lg shadow-lg w-full max-w-xl h-64 sm:h-80"
                        ></iframe>
                    </div>
                </div>

                {/* --- Social Media Section --- */}
                <div className="w-full flex flex-col items-center">
                    <h2 className="text-3xl font-bold text-yellow-500 text-center mb-6">
                        Connect With Us
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full">
                        <button
                            onClick={() => window.open("https://www.instagram.com/cyp.vasai/", "_blank")}
                            className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-yellow-500 text-white font-medium px-5 py-3 rounded-xl shadow hover:opacity-90 transition w-full sm:w-auto justify-center"
                        >
                            <FaInstagram className="text-2xl" />
                            <span>CYP Vasai</span>
                        </button>

                        <button
                            onClick={() =>
                                window.open("https://www.instagram.com/cyp.youngprofessionals/", "_blank")
                            }
                            className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-yellow-500 text-white font-medium px-5 py-3 rounded-xl shadow hover:opacity-90 transition w-full sm:w-auto justify-center"
                        >
                            <FaInstagram className="text-2xl" />
                            <span>Young Professionals</span>
                        </button>

                        <button
                            onClick={() => window.open("https://www.youtube.com/@cyp-vasai", "_blank")}
                            className="flex items-center gap-2 bg-red-600 text-white font-medium px-5 py-3 rounded-xl shadow hover:bg-red-700 transition w-full sm:w-auto justify-center"
                        >
                            <FaYoutube className="text-2xl" />
                            <span>Our YouTube Channel</span>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
