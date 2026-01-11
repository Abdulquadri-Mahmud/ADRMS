"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative w-full bg-transparent pt-24 pb-32 overflow-hidden">

      <div className="relative max-w-7xl mx-auto px-6 md:px-12 lg:px-8 text-center">

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 mb-8"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-800">Secure & Official Record Keeping</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 tracking-tight mb-6 leading-[1.1]"
        >
          Ahmadiyyah Digital <br />
          Records Management System
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-6 text-gray-600 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
        >
          A professional digital ledger designed to organize, secure, and manage Jamā’at financial records with precision. Move beyond spreadsheets to a centralized system.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/login" className="w-full sm:w-auto px-8 py-3.5 bg-gray-900 text-white rounded-lg font-semibold shadow-lg hover:bg-black transition-all flex items-center justify-center group">
            Admin Access
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link href="/docs" className="w-full sm:w-auto px-8 py-3.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
            How It Works Guide
          </Link>
        </motion.div>
      </div>
    </section>
  );
}