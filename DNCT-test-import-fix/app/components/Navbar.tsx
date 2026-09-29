"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Tách logic class ra đây để tránh lỗi đỏ trong JSX
  const navBg = isScrolled 
    ? "bg-white/80 backdrop-blur-md shadow-md py-3" 
    : "bg-transparent py-5";

  return (
    <nav className={`fixed top-0 w-full z-[100] transition-all duration-300 ${navBg}`}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold text-blue-600 flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg"></div>
          <span>DNCT</span>
        </Link>

        {/* Menu Items */}
        <div className="hidden md:flex space-x-8 font-medium text-gray-700">
          <Link href="/" className="hover:text-blue-600 transition">Trang chủ</Link>
          <Link href="/practice" className="hover:text-blue-600 transition">Luyện tập</Link>
          <Link href="/quiz" className="hover:text-blue-600 transition">Kỳ thi</Link>
        </div>

        {/* Login Button */}
        <button className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition shadow-lg shadow-blue-200 font-semibold">
          Đăng nhập
        </button>
      </div>
    </nav>
  );
};