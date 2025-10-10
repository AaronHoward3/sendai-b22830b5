import React from 'react';
import { motion } from 'framer-motion';
import { FileText, AlertTriangle, Shield, CreditCard, Users, Mail } from 'lucide-react';
import { SYS_COMPANY } from '@/utils/constants';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const TermsOfService = () => {
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
                  <FileText className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-4xl font-bold text-foreground mb-4">Terms of Service</h1>
                <p className="text-lg text-muted-foreground">
                  These terms govern your use of our AI-powered email marketing platform.
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
              {/* Acceptance of Terms */}
              <motion.div variants={fadeInUp} className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <AlertTriangle className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-foreground">Acceptance of Terms</h2>
                </div>
                
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-6 rounded-lg mb-6">
                  <p className="text-amber-800 dark:text-amber-200">
                    <strong>Important:</strong> By accessing and using {SYS_COMPANY.name}'s services, you agree to be bound by these Terms of Service. 
                    If you do not agree to these terms, please do not use our services.
                  </p>
                </div>
                
                <p className="text-muted-foreground">
                  These Terms of Service ("Terms") govern your use of our AI-powered email marketing platform 
                  and services (the "Service") operated by {SYS_COMPANY.name} ("us", "we", or "our").
                </p>
              </motion.div>

              {/* Service Description */}
              <motion.div variants={fadeInUp} className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-foreground">Service Description</h2>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-muted/30 p-6 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">What We Provide</h3>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li>• AI-powered email campaign generation</li>
                      <li>• Brand data scraping and analysis</li>
                      <li>• Email template customization</li>
                      <li>• Campaign performance analytics</li>
                    </ul>
                  </div>
                  <div className="bg-muted/30 p-6 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Service Availability</h3>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li>• 99.9% uptime commitment</li>
                      <li>• Regular feature updates</li>
                      <li>• 24/7 customer support</li>
                      <li>• Secure data handling</li>
                    </ul>
                  </div>
                </div>
              </motion.div>

              {/* User Responsibilities */}
              <motion.div variants={fadeInUp} className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <Users className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-foreground">User Responsibilities</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="flex gap-4 p-4 bg-muted/20 rounded-lg">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">Account Security</h3>
                      <p className="text-sm text-muted-foreground">You are responsible for maintaining the confidentiality of your account credentials</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 p-4 bg-muted/20 rounded-lg">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">Compliance</h3>
                      <p className="text-sm text-muted-foreground">Ensure all email campaigns comply with applicable laws and regulations (CAN-SPAM, GDPR, etc.)</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 p-4 bg-muted/20 rounded-lg">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">3</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">Content Accuracy</h3>
                      <p className="text-sm text-muted-foreground">Verify the accuracy of all content generated by our AI before sending campaigns</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Payment Terms */}
              <motion.div variants={fadeInUp} className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <CreditCard className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-foreground">Payment Terms</h2>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-muted/20 rounded-lg">
                    <div className="w-12 h-12 bg-primary/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Billing</h3>
                    <p className="text-sm text-muted-foreground">Subscriptions are billed in advance on a monthly or annual basis</p>
                  </div>
                  
                  <div className="text-center p-6 bg-muted/20 rounded-lg">
                    <div className="w-12 h-12 bg-primary/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Refunds</h3>
                    <p className="text-sm text-muted-foreground">30-day money-back guarantee for new subscriptions</p>
                  </div>
                  
                  <div className="text-center p-6 bg-muted/20 rounded-lg">
                    <div className="w-12 h-12 bg-primary/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Cancellation</h3>
                    <p className="text-sm text-muted-foreground">Cancel anytime with 30 days notice</p>
                  </div>
                </div>
              </motion.div>

              {/* Prohibited Uses */}
              <motion.div variants={fadeInUp} className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                  <h2 className="text-2xl font-bold text-foreground">Prohibited Uses</h2>
                </div>
                
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 rounded-lg">
                  <h3 className="font-semibold text-red-800 dark:text-red-200 mb-4">You may not use our service to:</h3>
                  <ul className="text-sm text-red-700 dark:text-red-300 space-y-2">
                    <li>• Send spam, unsolicited, or illegal emails</li>
                    <li>• Violate any applicable laws or regulations</li>
                    <li>• Infringe on intellectual property rights</li>
                    <li>• Transmit malicious code or viruses</li>
                    <li>• Attempt to gain unauthorized access to our systems</li>
                    <li>• Use the service for any unlawful or prohibited purpose</li>
                  </ul>
                </div>
              </motion.div>

              {/* Limitation of Liability */}
              <motion.div variants={fadeInUp} className="mb-12">
                <h2 className="text-2xl font-bold text-foreground mb-6">Limitation of Liability</h2>
                
                <div className="bg-muted/20 p-6 rounded-lg">
                  <p className="text-muted-foreground mb-4">
                    To the maximum extent permitted by law, {SYS_COMPANY.name} shall not be liable for any indirect, 
                    incidental, special, consequential, or punitive damages, including without limitation, loss of profits, 
                    data, use, goodwill, or other intangible losses.
                  </p>
                  <p className="text-muted-foreground">
                    Our total liability to you for any damages arising from or related to these Terms or the Service 
                    shall not exceed the amount you paid us for the Service in the 12 months preceding the claim.
                  </p>
                </div>
              </motion.div>

              {/* Contact Information */}
              <motion.div variants={fadeInUp} className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <Mail className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-foreground">Contact Information</h2>
                </div>
                
                <div className="bg-primary/5 p-6 rounded-lg border border-primary/20">
                  <p className="text-muted-foreground mb-4">
                    If you have any questions about these Terms of Service, please contact us:
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

              {/* Changes to Terms */}
              <motion.div variants={fadeInUp} className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">Changes to Terms</h2>
                <p className="text-muted-foreground">
                  We reserve the right to modify these Terms at any time. We will notify users of any material 
                  changes by email or through the Service. Your continued use of the Service after such modifications 
                  constitutes acceptance of the updated Terms.
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

export default TermsOfService;
