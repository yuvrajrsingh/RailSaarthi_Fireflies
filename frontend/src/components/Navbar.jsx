// Navbar.jsx
import React, { useState, useEffect } from "react";
import { AiOutlineMenu, AiOutlineClose } from "react-icons/ai";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    { name: "Home", link: "/" },
    { name: "simulator", link: "/simulator" },
  ];

  const [systemTime, setSystemTime] = useState(
    new Date().toLocaleTimeString("en-IN", { hour12: false })
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setSystemTime(new Date().toLocaleTimeString("en-IN", { hour12: false }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <nav
      style={{ height: "4.6rem" }}
      className="
        backdrop-blur-xl bg-gradient-to-r 
        from-blue-950/95 via-blue-800/85 to-blue-700/85 
        border-b border-sky-300/20 shadow-[0_2px_12px_rgba(0,0,0,0.25)]
        sticky top-0 z-50 text-white flex items-center"
    >
      <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-between h-full">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 h-full group">
          <img
            src="logo.png"
            alt="logo"
            className="h-14 object-contain drop-shadow-[0_0_10px_rgba(56,189,248,0.5)] transition-transform group-hover:scale-105"
          />
          <span className="text-6xl font-extrabold bg-gradient-to-r from-sky-300 to-blue-200 text-transparent bg-clip-text tracking-wide drop-shadow">
            RailSaarthi
          </span>
        </Link>

        {/* Desktop Menu */}
        <ul className="hidden md:flex items-center gap-8 h-full">
          {menuItems.map((m, i) => {
            const active = location.pathname === m.link;
            return (
              <li key={i} className="flex items-center h-full">
                <Link
                  to={m.link}
                  className={`relative font-medium text-3xl tracking-wide transition-all duration-200 
                    ${
                      active
                        ? "text-sky-300 after:absolute after:left-0 after:-bottom-1 after:w-full after:h-[3px] after:bg-sky-300 after:rounded-lg"
                        : "text-blue-100 hover:text-sky-200 hover:drop-shadow-[0_0_6px_rgba(125,211,252,0.9)]"
                    }`}
                >
                  {m.name}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Right Section */}
        <div className="flex items-center gap-5 h-full">

          {/* Desktop Time */}
          <div className="hidden md:flex flex-col items-end">
            <span className=" text-sky-200 uppercase text-2xl tracking-wider">
              System Time
            </span>
            <div className="
              px-3 py-1 rounded-md bg-white/10 
              backdrop-blur-lg border border-sky-300/30 
              text-sm font-mono text-sky-100 shadow-inner
            ">
              {systemTime}
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-3xl text-sky-200 hover:text-sky-100 transition"
            onClick={() => setOpen(!open)}
          >
            {open ? <AiOutlineClose /> : <AiOutlineMenu />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      <div
        className={`md:hidden bg-blue-900/85 backdrop-blur-xl 
          border-t border-sky-300/20 
          overflow-hidden transition-all duration-300 ease-in-out
          ${open ? "max-h-72 shadow-lg" : "max-h-0"}
        `}
      >
        <ul className="flex flex-col px-6 py-4 space-y-2">

          {menuItems.map((m, i) => {
            const active = location.pathname === m.link;
            return (
              <li key={i}>
                <Link
                  to={m.link}
                  onClick={() => setOpen(false)}
                  className={`
                    block py-2 px-4 rounded-lg text-lg tracking-wide transition-all
                    ${
                      active
                        ? "bg-blue-700/60 text-sky-300 border border-sky-300/20 shadow-sm"
                        : "text-blue-100 hover:bg-blue-700/40 hover:text-sky-300"
                    }`}
                >
                  {m.name}
                </Link>
              </li>
            );
          })}

          {/* Time in Mobile */}
          <div className="
            mt-3 py-2 px-4 bg-blue-950/50 backdrop-blur-lg 
            border border-sky-300/20 rounded-md 
            text-sm font-mono text-sky-200 shadow-inner
          ">
            Time: {systemTime}
          </div>
        </ul>
      </div>
    </nav>
  );
}
