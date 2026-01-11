"use client";

import AboutSystem from "./component/about";
import Hero from "./component/Hero";
import HowItWorks from "./component/HowItWorks";
import Footer from "./component/layout/Footer";
import Header from "./component/layout/Header";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden">
      <Header />
      <main className="flex-grow">
        <Hero />
        <AboutSystem />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
}
