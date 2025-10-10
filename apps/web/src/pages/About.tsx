import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Users, Target, Zap } from 'lucide-react';
import { SYS_COMPANY } from '@/utils/constants';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const About = () => {
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
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              initial="hidden"
              animate="show"
              variants={staggerChildren}
              className="grid lg:grid-cols-2 gap-12 items-center"
            >
              <motion.div variants={fadeInUp}>
                <h1 className="text-5xl font-bold text-foreground mb-6">
                  About {SYS_COMPANY.name}
                </h1>
                
                <p className="text-xl text-muted-foreground mb-8">
                  We're revolutionizing email marketing with AI-powered tools that create 
                  professional, engaging campaigns in minutes, not hours.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <a
                    href="/"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Try Our Platform
                  </a>
                  <a
                    href={`mailto:${SYS_COMPANY.email_contact}`}
                    className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
                  >
                    <Mail className="w-5 h-5" />
                    Contact Us
                  </a>
                </div>
              </motion.div>
              
              <motion.div variants={fadeInUp} className="relative">
                <div className="relative">
                  <div className="w-full h-80 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-24 h-24 bg-primary/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <Zap className="w-12 h-12 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">AI-Powered</h3>
                      <p className="text-muted-foreground">Smart email generation</p>
                    </div>
                  </div>
                  {/* Floating elements */}
                  <div className="absolute -top-4 -right-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <Target className="w-8 h-8 text-primary" />
                  </div>
                  <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={staggerChildren}
              className="grid lg:grid-cols-2 gap-12 items-center"
            >
              <motion.div variants={fadeInUp} className="order-2 lg:order-1">
                <div className="relative">
                  <div className="w-full h-96 bg-gradient-to-tr from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center relative overflow-hidden">
                    {/* Background pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-10 left-10 w-20 h-20 border-2 border-primary/30 rounded-full"></div>
                      <div className="absolute top-20 right-20 w-16 h-16 border-2 border-primary/30 rounded-full"></div>
                      <div className="absolute bottom-20 left-20 w-12 h-12 border-2 border-primary/30 rounded-full"></div>
                      <div className="absolute bottom-10 right-10 w-24 h-24 border-2 border-primary/30 rounded-full"></div>
                    </div>
                    
                    {/* Central content */}
                    <div className="text-center relative z-10">
                      <div className="w-32 h-32 bg-primary/20 rounded-full mx-auto mb-6 flex items-center justify-center">
                        <Mail className="w-16 h-16 text-primary" />
                      </div>
                      <h3 className="text-2xl font-bold text-foreground mb-2">Smart Automation</h3>
                      <p className="text-muted-foreground">AI-driven email marketing</p>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              <motion.div variants={fadeInUp} className="order-1 lg:order-2">
                <h2 className="text-3xl font-bold text-foreground mb-6">Our Mission</h2>
                <p className="text-lg text-muted-foreground mb-6">
                  To democratize professional email marketing by making it accessible, 
                  efficient, and effective for businesses of all sizes. We believe every 
                  company deserves world-class marketing tools.
                </p>
                <p className="text-lg text-muted-foreground mb-8">
                  Our AI-powered platform transforms complex marketing workflows into 
                  simple, automated processes that deliver results.
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background p-4 rounded-lg border">
                    <Target className="w-6 h-6 text-primary mb-2" />
                    <h3 className="font-semibold text-foreground mb-1">Precision</h3>
                    <p className="text-xs text-muted-foreground">
                      AI-powered targeting
                    </p>
                  </div>
                  <div className="bg-background p-4 rounded-lg border">
                    <Zap className="w-6 h-6 text-primary mb-2" />
                    <h3 className="font-semibold text-foreground mb-1">Speed</h3>
                    <p className="text-xs text-muted-foreground">
                      Minutes, not hours
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={staggerChildren}
              className="text-center mb-12"
            >
              <motion.h2 variants={fadeInUp} className="text-3xl font-bold text-foreground mb-6">
                Our Values
              </motion.h2>
              <motion.p variants={fadeInUp} className="text-lg text-muted-foreground max-w-2xl mx-auto">
                These principles guide everything we do and every decision we make.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={staggerChildren}
              className="grid md:grid-cols-3 gap-8"
            >
              <motion.div variants={fadeInUp} className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">User-Centric</h3>
                <p className="text-muted-foreground">
                  Every feature is designed with our users' success in mind. We listen, 
                  learn, and iterate based on real feedback.
                </p>
              </motion.div>

              <motion.div variants={fadeInUp} className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Innovation</h3>
                <p className="text-muted-foreground">
                  We're constantly pushing the boundaries of what's possible with AI 
                  and automation in marketing.
                </p>
              </motion.div>

              <motion.div variants={fadeInUp} className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Excellence</h3>
                <p className="text-muted-foreground">
                  We strive for excellence in everything we do, from our code to our 
                  customer support.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={staggerChildren}
              className="text-center mb-12"
            >
              <motion.h2 variants={fadeInUp} className="text-3xl font-bold text-foreground mb-6">
                Meet Our Team
              </motion.h2>
              <motion.p variants={fadeInUp} className="text-lg text-muted-foreground max-w-2xl mx-auto">
                We're a passionate group of developers, designers, and marketers working 
                together to revolutionize email marketing.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={staggerChildren}
              className="grid md:grid-cols-3 gap-8"
            >
              <motion.div variants={fadeInUp} className="text-center group">
                <div className="relative mb-6">
                  <div className="w-32 h-32 bg-gradient-to-br from-primary to-primary/60 rounded-2xl mx-auto flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                    <span className="text-3xl font-bold text-white">JD</span>
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-1">John Doe</h3>
                <p className="text-primary mb-3 font-medium">CEO & Founder</p>
                <p className="text-sm text-muted-foreground">
                  Visionary leader with 10+ years in AI and marketing automation.
                </p>
              </motion.div>

              <motion.div variants={fadeInUp} className="text-center group">
                <div className="relative mb-6">
                  <div className="w-32 h-32 bg-gradient-to-br from-primary to-primary/60 rounded-2xl mx-auto flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                    <span className="text-3xl font-bold text-white">JS</span>
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-1">Jane Smith</h3>
                <p className="text-primary mb-3 font-medium">CTO</p>
                <p className="text-sm text-muted-foreground">
                  Technical architect with expertise in machine learning and scalable systems.
                </p>
              </motion.div>

              <motion.div variants={fadeInUp} className="text-center group">
                <div className="relative mb-6">
                  <div className="w-32 h-32 bg-gradient-to-br from-primary to-primary/60 rounded-2xl mx-auto flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                    <span className="text-3xl font-bold text-white">MJ</span>
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <Target className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-1">Mike Johnson</h3>
                <p className="text-primary mb-3 font-medium">Head of Product</p>
                <p className="text-sm text-muted-foreground">
                  Product strategist focused on user experience and market research.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={staggerChildren}
            >
              <motion.h2 variants={fadeInUp} className="text-3xl font-bold text-foreground mb-6">
                Get in Touch
              </motion.h2>
              <motion.p variants={fadeInUp} className="text-lg text-muted-foreground mb-8">
                Have questions about our platform? Want to learn more about our AI capabilities? 
                We'd love to hear from you.
              </motion.p>
              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href={`mailto:${SYS_COMPANY.email_contact}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  Contact Us
                </a>
                <a
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Try Our Platform
                </a>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
