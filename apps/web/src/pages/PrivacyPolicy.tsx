import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, Lock, Database, Mail, Users } from 'lucide-react';
import { SYS_COMPANY } from '@/utils/constants';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const PrivacyPolicy = () => {
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8 } }
  };

  const staggerChildren = {
    hidden: {},
    show: { transition: { staggerChildren: 0.2 } }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-4xl text-center">
            <motion.div
              initial="hidden"
              animate="show"
              variants={staggerChildren}
            >
              <motion.div variants={fadeInUp} className="mb-8">
                <div className="w-20 h-20 bg-primary/20 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <Shield className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
                <p className="text-lg text-muted-foreground">
                  Your privacy is important to us. This policy explains how we collect, use, and protect your information.
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  Last updated: {new Date().toLocaleDateString()}
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={staggerChildren}
              className="prose prose-lg max-w-none"
            >
              {/* Information We Collect */}
              <motion.div variants={fadeInUp} className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <Database className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-foreground">Information We Collect</h2>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-muted/30 p-6 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Personal Information</h3>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li>• Name and email address</li>
                      <li>• Account credentials</li>
                      <li>• Payment information (processed securely)</li>
                      <li>• Profile information you provide</li>
                    </ul>
                  </div>
                  <div className="bg-muted/30 p-6 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Usage Data</h3>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li>• Website interactions and features used</li>
                      <li>• Email campaigns created and sent</li>
                      <li>• Performance metrics and analytics</li>
                      <li>• Device and browser information</li>
                    </ul>
                  </div>
                </div>
              </motion.div>

              {/* How We Use Information */}
              <motion.div variants={fadeInUp} className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <Eye className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-foreground">How We Use Your Information</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="flex gap-4 p-4 bg-muted/20 rounded-lg">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">Service Delivery</h3>
                      <p className="text-sm text-muted-foreground">To provide and maintain our AI-powered email marketing services</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 p-4 bg-muted/20 rounded-lg">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">Communication</h3>
                      <p className="text-sm text-muted-foreground">To send you important updates, support messages, and service notifications</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 p-4 bg-muted/20 rounded-lg">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">3</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">Improvement</h3>
                      <p className="text-sm text-muted-foreground">To analyze usage patterns and improve our AI algorithms and user experience</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Data Protection */}
              <motion.div variants={fadeInUp} className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <Lock className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-foreground">Data Protection & Security</h2>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-muted/20 rounded-lg">
                    <div className="w-12 h-12 bg-primary/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Lock className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Encryption</h3>
                    <p className="text-sm text-muted-foreground">All data is encrypted in transit and at rest using industry-standard protocols</p>
                  </div>
                  
                  <div className="text-center p-6 bg-muted/20 rounded-lg">
                    <div className="w-12 h-12 bg-primary/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Access Control</h3>
                    <p className="text-sm text-muted-foreground">Strict access controls ensure only authorized personnel can access your data</p>
                  </div>
                  
                  <div className="text-center p-6 bg-muted/20 rounded-lg">
                    <div className="w-12 h-12 bg-primary/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Database className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Secure Storage</h3>
                    <p className="text-sm text-muted-foreground">Data is stored in secure, SOC 2 compliant cloud infrastructure</p>
                  </div>
                </div>
              </motion.div>

              {/* Your Rights */}
              <motion.div variants={fadeInUp} className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <Users className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-foreground">Your Rights</h2>
                </div>
                
                <div className="bg-muted/20 p-6 rounded-lg">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-foreground mb-3">Access & Control</h3>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li>• Access your personal data</li>
                        <li>• Update or correct information</li>
                        <li>• Download your data</li>
                        <li>• Delete your account</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-3">Communication</h3>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li>• Opt-out of marketing emails</li>
                        <li>• Control notification preferences</li>
                        <li>• Request data portability</li>
                        <li>• Withdraw consent</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Contact Information */}
              <motion.div variants={fadeInUp} className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <Mail className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-foreground">Contact Us</h2>
                </div>
                
                <div className="bg-primary/5 p-6 rounded-lg border border-primary/20">
                  <p className="text-muted-foreground mb-4">
                    If you have any questions about this Privacy Policy or our data practices, please contact us:
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <a
                      href={`mailto:${SYS_COMPANY.email_contact}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      Email Us
                    </a>
                    <span className="text-sm text-muted-foreground flex items-center">
                      We typically respond within 24 hours
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Updates */}
              <motion.div variants={fadeInUp} className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">Policy Updates</h2>
                <p className="text-muted-foreground">
                  We may update this Privacy Policy from time to time. We will notify you of any changes 
                  by posting the new Privacy Policy on this page and updating the "Last updated" date. 
                  You are advised to review this Privacy Policy periodically for any changes.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
