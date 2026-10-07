"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

const navItems = [
  { name: "Home", href: "/" },
  { name: "Products", href: "/products" },
  { name: "About Us", href: "/about-us" },
  { name: "Company", href: "/company" },
  { name: "Resources", href: "/resources" },
  { name: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="w-full border-b border-gray-200 bg-white font-sans text-gray-900 antialiased shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          {/* Logo */}
          <Link
            href="/"
            className="flex shrink-0 items-center"
            aria-label="SRIMAX Home"
          >
            <Image
              src="/images/srimax-logo.png"
              alt="SRIMAX"
              width={145}
              height={45}
              className="h-10 w-auto sm:h-11 lg:h-12"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-x-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`relative px-3 py-2 text-sm leading-none tracking-[0.01em] transition-colors duration-200 ${
                  isActive(item.href)
                    ? "border-b-2 border-[#14275f] font-semibold text-[#14275f]"
                    : "border-b-2 border-transparent font-medium text-gray-600 hover:border-[#14275f] hover:text-[#14275f]"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Desktop Right Section */}
          <div className="hidden items-center gap-x-4 md:flex">
            {/* Search */}
            <div className="relative">
              <label htmlFor="desktop-search" className="sr-only">
                Search SKU or Class
              </label>
              <input
                id="desktop-search"
                type="search"
                placeholder="Search SKU or Class"
                className="h-10 w-48 rounded-md border border-gray-300 bg-gray-50 pl-4 pr-10 text-sm leading-none tracking-[0.01em] text-gray-900 outline-none transition-colors duration-200 placeholder:font-normal placeholder:text-gray-500 focus:border-[#14275f] focus:bg-white focus:ring-2 focus:ring-[#14275f]/20 lg:w-56"
              />
              <svg
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-4.35-4.35m2.1-5.4a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
                />
              </svg>
            </div>

            {/* Enquiry Button */}
            <Link
              href="/contact"
              className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md bg-[#f50909] px-6 text-xs font-bold uppercase leading-none tracking-[0.14em] text-white transition-colors duration-200 hover:bg-[#d90000] focus:outline-none focus:ring-2 focus:ring-[#f50909] focus:ring-offset-2"
            >
              Send Enquiry
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-gray-500 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#14275f] focus:ring-offset-2 md:hidden"
            aria-label="Toggle navigation"
            aria-expanded={isOpen}
          >
            {isOpen ? (
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 6l12 12M18 6 6 18"
                />
              </svg>
            ) : (
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 7h16M4 12h16M4 17h16"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out md:hidden ${
            isOpen ? "max-h-[36rem] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-6">
            {/* Mobile Navigation */}
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`block rounded-md px-3 py-3 text-[15px] leading-tight tracking-[0.01em] transition-colors duration-200 ${
                    isActive(item.href)
                      ? "bg-[#14275f] font-semibold text-white"
                      : "font-medium text-gray-700 hover:bg-gray-100 hover:text-[#14275f]"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Mobile Search */}
            <div className="relative mt-6">
              <label htmlFor="mobile-search" className="sr-only">
                Search SKU or Class
              </label>
              <input
                id="mobile-search"
                type="search"
                placeholder="Search SKU or Class"
                className="h-12 w-full rounded-md border border-gray-300 bg-white px-4 pr-12 text-base leading-none tracking-[0.01em] text-gray-900 outline-none transition-colors duration-200 placeholder:font-normal placeholder:text-gray-500 focus:border-[#14275f] focus:ring-2 focus:ring-[#14275f]/20"
              />
              <svg
                className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-4.35-4.35m2.1-5.4a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
                />
              </svg>
            </div>

            {/* Mobile Enquiry */}
            <Link
              href="/contact"
              onClick={() => setIsOpen(false)}
              className="mt-4 flex h-12 w-full items-center justify-center whitespace-nowrap rounded-md bg-[#f50909] text-[13px] font-bold uppercase leading-none tracking-[0.14em] text-white transition-colors duration-200 hover:bg-[#d90000] focus:outline-none focus:ring-2 focus:ring-[#f50909] focus:ring-offset-2"
            >
              Send Enquiry
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}