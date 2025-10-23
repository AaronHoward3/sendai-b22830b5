import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram as InstagramIcon, Linkedin } from 'lucide-react';
import { Logo } from './ui/Logo';
import { SYS_COMPANY } from '@/utils/constants';

const Footer = () => {
  return (
    <footer className="bg-background/50 backdrop-blur-sm border-t border-border">
      <div className="container mx-auto py-3">
        {/* Top Section */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-3">
          <div className="mb-3 sm:mb-0"><Logo /></div>
          {/* Navigation Links */}
          <div className="flex items-center gap-8">
            <Link 
              to="/about" 
              className="text-foreground hover:text-muted-foreground transition-colors text-sm font-medium"
            >About Us</Link>
            <Link 
              to="/pricing" 
              className="text-foreground hover:text-muted-foreground transition-colors text-sm font-medium"
            >Pricing</Link>
            <a 
              href={`mailto:${SYS_COMPANY.email_contact}`}
              className="text-foreground hover:text-muted-foreground transition-colors text-sm font-medium"
            >Contact Us</a>
          </div>
        </div>
        <div className="border-t border-gray-200 mb-3"></div>
        {/* Bottom Section */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Left: Copyright */}
          <div className="flex items-center gap-4">
            <p className="text-gray-500 text-xs">© {new Date().getFullYear()} {SYS_COMPANY.name}, Inc.</p>
            {/* Social Media Icons */}
            {/* <div className="flex items-center gap-3">
              <a 
                href="https://instagram.com"  target="_blank"  rel="noopener noreferrer"
                className="text-foreground hover:text-gray-500 transition-colors"
              >
                <InstagramIcon className="w-5 h-5" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-foreground hover:text-gray-500 transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div> */}
          </div>

          {/* Right: Legal/Locale Links */}
          <div className="flex items-center gap-6">
            <Link 
              to="/privacy-policy" 
              className="text-gray-500 hover:text-foreground transition-colors text-xs"
            >
              Privacy Policy
            </Link>
            <Link 
              to="/terms-of-service" 
              className="text-gray-500 hover:text-foreground transition-colors text-xs"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
