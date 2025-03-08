import { useState, useEffect } from "react";
import Image from "next/image";
import { SunIcon, MoonIcon } from "@heroicons/react/24/solid";
import profilePic from "../assets/pfp.png"; // Update path as needed

const Navbar = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [displayText, setDisplayText] = useState("A");

  // Check for system theme and stored preference
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (storedTheme === "dark" || (!storedTheme && systemPrefersDark)) {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    }

    // Scroll event listener to make navbar translucent
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Simplified typewriter animation effect
  useEffect(() => {
    const targetText = "Authexity";
    
    const startAnimation = setTimeout(() => {
      let currentIndex = 1; // Start with "a" already showing
      
      const intervalId = setInterval(() => {
        if (currentIndex < targetText.length) {
          setDisplayText(targetText.substring(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(intervalId);
        }
      }, 150); // Speed of typewriter effect
      
      return () => clearInterval(intervalId);
    }, 500); // Delay before starting animation
    
    return () => clearTimeout(startAnimation);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);

    if (newMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <nav
      className={`fixed top-0 w-full px-6 py-4 flex justify-between items-center shadow-md z-50 transition-all duration-300 ${
        isScrolled
          ? "backdrop-blur-md bg-[#040906]/60 dark:bg-[#040906]/80"
          : "bg-[#040906] dark:bg-[#040906]"
      }`}
    >
      <h1 className="text-xl font-bold text-[#e6f4eb] dark:text-[#e6f4eb] min-w-[120px]">
        {displayText}
      </h1>

      <div className="flex items-center gap-4">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full bg-[#a4d5b3] dark:bg-[#6e335f] shadow-md transition"
        >
          {darkMode ? (
            <SunIcon className="h-6 w-6 text-[#e6f4eb]" />
          ) : (
            <MoonIcon className="h-6 w-6 text-[#040906]" />
          )}
        </button>

        {/* User Profile */}
        <div className="w-10 h-10 bg-[#a4d5b3] dark:bg-[#6e335f] rounded-full overflow-hidden">
          <Image src={profilePic} alt="Profile" width={40} height={40} />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
