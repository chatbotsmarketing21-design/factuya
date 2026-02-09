import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Send, CreditCard, CheckCircle, Zap, Shield } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

const Home = () => {
  const features = [
    {
      icon: <FileText className="w-12 h-12" />,
      title: "Create an Invoice",
      description: "Choose from 100 templates and various logos"
    },
    {
      icon: <Send className="w-12 h-12" />,
      title: "Send as a PDF",
      description: "Email or print your invoice to send to your clients"
    },
    {
      icon: <CreditCard className="w-12 h-12" />,
      title: "Get Paid",
      description: "Receive payments in seconds by card or PayPal"
    }
  ];

  const benefits = [
    { icon: <CheckCircle className="w-5 h-5" />, text: "100+ Professional Templates" },
    { icon: <CheckCircle className="w-5 h-5" />, text: "Unlimited Invoices" },
    { icon: <CheckCircle className="w-5 h-5" />, text: "Cloud Storage" },
    { icon: <CheckCircle className="w-5 h-5" />, text: "Mobile & Desktop Access" },
    { icon: <CheckCircle className="w-5 h-5" />, text: "Multi-Currency Support" },
    { icon: <CheckCircle className="w-5 h-5" />, text: "Email & PDF Export" }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-gray-900">invoice </span>
              <span className="text-2xl font-bold text-yellow-400 bg-yellow-400 text-gray-900 px-2 ml-1">home</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/signin">
                <Button variant="ghost" className="text-gray-700 hover:text-gray-900">
                  Sign In
                </Button>
              </Link>
              <Link to="/create">
                <Button className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold">
                  Create Invoice
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              100 Free Invoice Templates | Print & Email Invoices
            </h1>
            <Link to="/create">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white text-xl px-12 py-6 rounded-lg mt-8">
                Create Invoice Now!
              </Button>
            </Link>
          </div>

          {/* Hero Image Placeholder */}
          <div className="mt-16 relative">
            <div className="mx-auto max-w-4xl bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg shadow-2xl p-8 min-h-[400px] flex items-center justify-center">
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white rounded shadow-md p-4 h-40 flex flex-col">
                    <div className="h-4 bg-blue-200 rounded w-3/4 mb-2"></div>
                    <div className="h-2 bg-gray-200 rounded w-full mb-1"></div>
                    <div className="h-2 bg-gray-200 rounded w-full mb-1"></div>
                    <div className="h-2 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-yellow-100 rounded-full mb-6">
                  <div className="text-yellow-600">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 text-lg">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything You Need</h2>
            <p className="text-xl text-gray-600">Professional invoicing made simple</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-3 text-gray-700">
                <div className="text-green-600 flex-shrink-0">{benefit.icon}</div>
                <span className="text-lg">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Start Creating Professional Invoices Today
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of businesses using Invoice Home
          </p>
          <Link to="/create">
            <Button size="lg" className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold text-xl px-12 py-6 rounded-lg">
              Get Started - It's Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white font-semibold mb-4">Invoice Home</h3>
              <p className="text-sm">Professional invoicing for small businesses and freelancers.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Templates</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; 2025 Invoice Home Clone. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;