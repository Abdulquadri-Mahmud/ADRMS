"use client";

import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

export default function AboutSystem() {
  const features = [
    "Automated Record Management with unique Receipt IDs",
    "Secure & Encrypted Database Storage",
    "Streamlined Administrative Workflow for Officials",
    "Excel Import/Export for Flexible Reporting",
    "Real-time Financial Totals and Analytics",
  ];

  return (
    <section id="features" className="relative w-full bg-transparent py-24 overflow-hidden">

      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-sm font-black text-emerald-600 uppercase tracking-[0.2em] mb-4">
            System Core
          </h2>
          <h3 className="text-4xl font-black text-gray-900 mb-8 tracking-tight">
            Modernizing Record Keeping for Reliability & Transparency
          </h3>

          <p className="text-gray-600 text-lg leading-relaxed mb-10 font-medium">
            The Ahmadiyyah Record Management System (ADRMS) is a purpose-built digital solution designed to replace manual ledger keeping. It combines the familiarity of spreadsheet data handling with the security and reliability of a modern database application.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="flex items-center space-x-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm"
              >
                <CheckCircle className="flex-shrink-0 h-5 w-5 text-emerald-500" />
                <span className="text-gray-700 font-bold text-sm tracking-tight">{feature}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
