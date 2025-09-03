
import React from 'react';
import { Link } from 'react-router-dom';
import { GradientButton } from '@/components/ui/gradient-button';
import { ArrowRight } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { useTheme } from '@/hooks/useTheme';
import { motion } from 'framer-motion';

export const DotBackground: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const dots = Array.from({ length: 40 }, (_, i) => ({ id: `home-dot-${i}` }));

  return (
    <>
      <div
        className="absolute inset-0 z-0 overflow-hidden"
        style={{ backgroundColor: isDark ? "#0a1426" : "#eeeeeeff" }}
      >
        {dots.map((dot) => {
          const size = Math.random() * 200 + 200; // 40px to 80px
          const x = Math.random() * 100;
          const y = Math.random() * 100;
          const delay = Math.random() * 7;

          return (
            <div
              key={dot.id}
              className={`absolute rounded-full animate-dot-float ${isDark ? "mix-blend-screen" : ""}`}
              style={{
                top: `${y}vh`,
                left: `${x}vw`,
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: isDark ? "#03251bff" : "#ddf5e5ff",
                filter: "blur(100px)",
                opacity: isDark ? 0.35 : 0.6,
                animationDelay: `${-delay}s`,
              }}
            />
          );
        })}
      </div>

      <style>{`
        @keyframes dot-float {
          0% { transform: translateY(0); opacity: 0.8; }
          100% { transform: translateY(-100px); opacity: 0.5; }
        }
        .animate-dot-float {
          animation: dot-float 7s ease-in-out infinite alternate;
        }
      `}</style>
    </>
  );
};

const Home = () => {
  const containerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.25
      }
    }
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut" as const
      }
    }
  };

  return (
    <>
      <Navigation />
      <div className="fixed inset-0 overflow-hidden z-0">
        <DotBackground />

        <div className="relative z-10 h-screen flex items-center justify-center px-4 pt-16">
          <motion.div
            className="text-center max-w-4xl mx-auto space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <motion.h1
              className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight bg-gradient-to-r from-gradient-start to-gradient-end bg-clip-text text-transparent"
              variants={fadeInUp}
            >
              SendAI
            </motion.h1>

            <motion.p
              className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed font-medium"
              variants={fadeInUp}
            >
              Create beautiful, responsive email templates with AI-powered generation.
            </motion.p>

            <motion.div variants={fadeInUp} className="pt-8">
              <Link to="/generator">
                <GradientButton variant="solid" size="xl" className="group font-bold transition-transform duration-200 ease-in-out hover:scale-105">
                  Generate Emails
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </GradientButton>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Home;
