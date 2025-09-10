import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, Download, Save, Zap } from 'lucide-react';

interface SubscriptionPromptProps {
  onSubscribe: () => void;
  onSignIn: () => void;
}

export const SubscriptionPrompt: React.FC<SubscriptionPromptProps> = ({
  onSubscribe,
  onSignIn,
}) => {
  return (
    <Card className="w-full max-w-2xl mx-auto border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
          <Zap className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900">
          Unlock Full Access
        </CardTitle>
        <p className="text-gray-600 mt-2">
          You've seen what we can do! Subscribe to access all features and save your emails.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-gray-900">Save & Access</h4>
              <p className="text-sm text-gray-600">Save emails to your account and access them anytime</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Mail className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-gray-900">Unlimited Generations</h4>
              <p className="text-sm text-gray-600">Generate as many emails as you need</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Download className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-gray-900">Export Options</h4>
              <p className="text-sm text-gray-600">Download MJML, HTML, and more formats</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Save className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-gray-900">Custom Images</h4>
              <p className="text-sm text-gray-600">Save and reuse custom hero images</p>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">$29</div>
            <div className="text-gray-600">per month</div>
            <div className="text-sm text-gray-500 mt-1">Cancel anytime</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={onSubscribe}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3"
          >
            Subscribe Now
          </Button>
          <Button 
            onClick={onSignIn}
            variant="outline"
            className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold py-3"
          >
            Sign In First
          </Button>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Already have an account? <button onClick={onSignIn} className="text-blue-600 hover:text-blue-700 underline">Sign in here</button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
