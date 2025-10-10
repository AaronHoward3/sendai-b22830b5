import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Star, Zap, Users, Target, Mail, CreditCard, Shield } from 'lucide-react';
import { SYS_PLANS, SYS_COMPANY } from '@/utils/constants';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const Pricing = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8 } }
  };

  const staggerChildren = {
    hidden: {},
    show: { transition: { staggerChildren: 0.2 } }
  };

  const getPlanFeatures = (plan: any) => {
    const features = [
      { icon: Mail, text: `${plan.quotas.emails} emails per month` },
      { icon: Zap, text: `${plan.quotas.images} AI-generated images` },
      { icon: Target, text: `${plan.quotas.revisions} revisions` },
      { icon: Users, text: `${plan.quotas.brands} brand profiles` },
    ];
    
    if (plan.key === 'STARTER' || plan.key === 'GROWTH' || plan.key === 'SCALE') {
      features.push(
        { icon: Shield, text: 'Priority support' },
        { icon: CreditCard, text: 'Advanced analytics' }
      );
    }
    
    if (plan.key === 'GROWTH' || plan.key === 'SCALE') {
      features.push(
        { icon: Users, text: 'Team collaboration' },
        { icon: Star, text: 'Custom templates' }
      );
    }
    
    if (plan.key === 'SCALE') {
      features.push(
        { icon: Zap, text: 'API access' },
        { icon: Star, text: 'White-label options' }
      );
    }
    
    return features;
  };

  const handleSelectPlan = (planKey: string) => {
    setSelectedPlan(planKey);
    
    // Handle different plan selections
    if (planKey === 'PAYG') {
      // For Pay As You Go, redirect to dashboard with plan parameter
      window.location.href = '/dashboard?plan=PAYG';
    } else {
      // For subscription plans, redirect to signup with plan parameter
      window.location.href = `/signup?plan=${planKey}`;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-6xl text-center">
            <motion.div
              initial="hidden"
              animate="show"
              variants={staggerChildren}
            >
              <motion.div variants={fadeInUp} className="mb-8">
                <div className="w-20 h-20 bg-primary/20 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <CreditCard className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-4xl font-bold text-foreground mb-4">Simple, Transparent Pricing</h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Choose the perfect plan for your email marketing needs. All plans include our AI-powered 
                  email generation and brand analysis tools.
                </p>
              </motion.div>

              {/* Billing Toggle */}
              <motion.div variants={fadeInUp} className="mb-12">
                <div className="inline-flex items-center bg-muted p-1 rounded-lg">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      billingCycle === 'monthly'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      billingCycle === 'yearly'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Yearly
                    <span className="ml-2 px-2 py-1 bg-primary/20 text-primary text-xs rounded-full">
                      Save 20%
                    </span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-7xl">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={staggerChildren}
              className="grid lg:grid-cols-4 md:grid-cols-2 gap-8"
            >
              {SYS_PLANS.map((plan, index) => {
                const isPopular = plan.key === 'STARTER';
                const features = getPlanFeatures(plan);
                
                return (
                  <motion.div
                    key={plan.key}
                    variants={fadeInUp}
                    className={`relative ${
                      isPopular 
                        ? 'lg:scale-105 border-primary shadow-lg' 
                        : 'border-border'
                    } bg-background rounded-2xl border p-8`}
                  >
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                          Most Popular
                        </div>
                      </div>
                    )}
                    
                    <div className="text-center mb-8">
                      <h3 className="text-xl font-bold text-foreground mb-2">{plan.title}</h3>
                      <p className="text-muted-foreground text-sm mb-4">{plan.blurb}</p>
                      <div className="mb-6">
                        <span className="text-4xl font-bold text-foreground">{plan.priceLabel}</span>
                        {billingCycle === 'yearly' && plan.key !== 'PAYG' && (
                          <span className="text-sm text-muted-foreground line-through ml-2">
                            ${Math.round(parseInt(plan.priceLabel.replace('$', '').replace(' / mo', '')) * 1.2)}/mo
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 mb-8">
                      {features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center gap-3">
                          <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <feature.icon className="w-3 h-3 text-primary" />
                          </div>
                          <span className="text-sm text-muted-foreground">{feature.text}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => handleSelectPlan(plan.key)}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                        isPopular
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'bg-muted text-foreground hover:bg-muted/80'
                      }`}
                    >
                      {plan.key === 'PAYG' ? 'Buy Credits' : 'Start Free Trial'}
                    </button>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* Features Comparison */}
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
                All Plans Include
              </motion.h2>
              <motion.p variants={fadeInUp} className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Every plan comes with our core AI-powered features and tools
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
                <div className="w-16 h-16 bg-primary/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">AI Email Generation</h3>
                <p className="text-muted-foreground">
                  Advanced AI creates professional, engaging email campaigns tailored to your brand and audience.
                </p>
              </motion.div>

              <motion.div variants={fadeInUp} className="text-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Brand Analysis</h3>
                <p className="text-muted-foreground">
                  Automatic brand data scraping and analysis to create consistent, on-brand content.
                </p>
              </motion.div>

              <motion.div variants={fadeInUp} className="text-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Email Templates</h3>
                <p className="text-muted-foreground">
                  Beautiful, responsive email templates optimized for all devices and email clients.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={staggerChildren}
              className="text-center mb-12"
            >
              <motion.h2 variants={fadeInUp} className="text-3xl font-bold text-foreground mb-6">
                Frequently Asked Questions
              </motion.h2>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={staggerChildren}
              className="space-y-6"
            >
              <motion.div variants={fadeInUp} className="bg-muted/20 p-6 rounded-lg">
                <h3 className="font-semibold text-foreground mb-2">Can I change plans anytime?</h3>
                <p className="text-muted-foreground">
                  Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, 
                  and we'll prorate any billing differences.
                </p>
              </motion.div>

              <motion.div variants={fadeInUp} className="bg-muted/20 p-6 rounded-lg">
                <h3 className="font-semibold text-foreground mb-2">What happens if I exceed my limits?</h3>
                <p className="text-muted-foreground">
                  We'll notify you when you're approaching your limits. You can purchase additional credits 
                  or upgrade your plan to continue using the service.
                </p>
              </motion.div>

              <motion.div variants={fadeInUp} className="bg-muted/20 p-6 rounded-lg">
                <h3 className="font-semibold text-foreground mb-2">Is there a free trial?</h3>
                <p className="text-muted-foreground">
                  Yes! New users get a free trial with limited credits to test our AI-powered email generation 
                  before committing to a paid plan.
                </p>
              </motion.div>

              <motion.div variants={fadeInUp} className="bg-muted/20 p-6 rounded-lg">
                <h3 className="font-semibold text-foreground mb-2">Do you offer refunds?</h3>
                <p className="text-muted-foreground">
                  We offer a 30-day money-back guarantee for all new subscriptions. If you're not satisfied, 
                  contact us for a full refund.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 bg-primary/5">
          <div className="container mx-auto max-w-4xl text-center">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={staggerChildren}
            >
              <motion.h2 variants={fadeInUp} className="text-3xl font-bold text-foreground mb-6">
                Ready to Get Started?
              </motion.h2>
              <motion.p variants={fadeInUp} className="text-lg text-muted-foreground mb-8">
                Join thousands of businesses already using our AI-powered email marketing platform.
              </motion.p>
              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Zap className="w-5 h-5" />
                  Start Free Trial
                </a>
                <a
                  href={`mailto:${SYS_COMPANY.email_contact}`}
                  className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  Contact Sales
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

export default Pricing;
