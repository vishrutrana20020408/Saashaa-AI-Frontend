import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ScrollToTopButton: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  useEffect(() => {
    const handleScroll = (): void => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;

      const progress = docHeight > 0 ? scrollTop / docHeight : 0;
      setScrollProgress(progress);

      setVisible(scrollTop > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = (): void => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* Circle math */
  const radius: number = 22;
  const circumference: number = 2 * Math.PI * radius;
  const strokeDashoffset: number =
    circumference - scrollProgress * circumference;

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          onClick={scrollToTop}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-8 right-8 z-[999] w-16 h-16 flex items-center justify-center cursor-pointer select-none"
          aria-label="Scroll to top"
        >
          {/* Progress Ring */}
          <svg
            className="absolute w-16 h-16 -rotate-90"
            viewBox="0 0 50 50"
          >
            <circle
              cx="25"
              cy="25"
              r={radius}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="4"
              fill="none"
            />
            <motion.circle
              cx="25"
              cy="25"
              r={radius}
              stroke="#4f46e5"
              strokeWidth="4"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.2s linear" }}
            />
          </svg>

          {/* Button Core */}
          <div className="w-12 h-12 rounded-full bg-indigo-900 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition">
            <ChevronUp size={24} strokeWidth={2.5} />
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default ScrollToTopButton;
