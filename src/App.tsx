import React, { useState } from 'react';
import {
  Activity,
  Menu,
  X,
  ShieldCheck,
  Search,
  ArrowRight,
  PhoneCall,
  Users,
  Building2,
  Stethoscope,
  FlaskConical,
  HeartPulse,
  Syringe,
  Pill,
  Smile,
  CheckCircle2,
  ChevronRight,
  User,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  Rocket,
  Droplet,
  Car,
  Home,
  HeartHandshake,
  Scan,
  Mail,
  Heart
} from 'lucide-react';
import { VitalLensModal } from './components/VitalLensModal';
import { AdminCommandCenter } from './components/AdminCommandCenter';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      const h = window.location.hash;
      if (p.startsWith('/command-center') || h.startsWith('#/command-center')) {
        return '/command-center';
      }
    }
    return '/';
  });

  React.useEffect(() => {
    const handleLocationChange = () => {
      const p = window.location.pathname;
      const h = window.location.hash;
      if (p.startsWith('/command-center') || h.startsWith('#/command-center')) {
        setCurrentPath('/command-center');
      } else {
        setCurrentPath('/');
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigate = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const [vitalLensOpen, setVitalLensOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('online-doctor');
  const [lastWhatsAppUrl, setLastWhatsAppUrl] = useState<string>('');
  const [bookingSubmitted, setBookingSubmitted] = useState(false);

  const [bookingForm, setBookingForm] = useState({
    fullName: '',
    gender: 'Male',
    phone: '',
    address: '',
    pincode: '',
    date: '',
    timeSlot: 'Morning (08:00 AM - 12:00 PM)',
    persons: '1',
  });

  const WHATSAPP_NUMBER = '919393934621';

  // 16 Exact Services split from https://i.ibb.co/gbq7HnhV/Nhealth-Healthcare-Services-Grid-1.png
  const services = [
    { id: 'online-doctor', name: 'Online Doctor Consultations', img: '/services/service_0.png', col: 0, row: 0 },
    { id: 'doctor-home-visits', name: 'Doctor Home Visits', img: '/services/service_1.png', col: 1, row: 0 },
    { id: 'doorstep-pharmacy', name: 'Doorstep Pharmacy', img: '/services/service_2.png', col: 2, row: 0 },
    { id: 'home-diagnostics', name: 'Home Diagnostics & Lab Tests', img: '/services/service_3.png', col: 3, row: 0 },
    { id: 'xray-portable', name: 'X-ray and Portable Diagnostics at Home', img: '/services/service_4.png', col: 0, row: 1 },
    { id: 'bedside-assistance', name: 'Bedside Assistance & Attendent', img: '/services/service_5.png', col: 1, row: 1 },
    { id: 'eldercare', name: 'Eldercare & Senior Assistance', img: '/services/service_6.png', col: 2, row: 1 },
    { id: 'specialized-nursing', name: 'Specialized Nursing Care at Home', img: '/services/service_7.png', col: 3, row: 1 },
    { id: 'physiotherapy', name: 'Physiotherapy at Home', img: '/services/service_8.png', col: 0, row: 2 },
    { id: 'dental-care', name: 'Dental Care & Oral Health', img: '/services/service_9.png', col: 1, row: 2 },
    { id: 'opd-hospital-assistance', name: 'Prepaid Premium OPD & Hospital Assistance', img: '/services/service_10.png', col: 2, row: 2 },
    { id: 'advance-imaging', name: 'Diagnostics & Advance Imaging', img: '/services/service_11.png', col: 3, row: 2 },
    { id: 'blood-bank', name: 'Blood Bank & Support', img: '/services/service_12.png', col: 0, row: 3 },
    { id: 'smart-ambulance', name: '24/7 Smart Ambulance & SOS', img: '/services/service_13.png', col: 1, row: 3 },
    { id: 'careride', name: 'Nhealth Careride', img: '/services/service_14.png', col: 2, row: 3 },
    { id: 'careassist', name: 'Nhealth Careassist', img: '/services/service_15.png', col: 3, row: 3 },
  ];

  const activeService = services.find((s) => s.id === selectedServiceId) || services[0];

  // Select service and smoothly target booking form
  const handleServiceSelect = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setBookingSubmitted(false);
    const formElement = document.getElementById('booking-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // WhatsApp formatted redirection with exact selected service and patient fields
  const formatWhatsAppBookingUrl = () => {
    const text =
      `*New Healthcare Appointment - Nhealth*\n` +
      `--------------------------------\n` +
      `• *Selected Service:* ${activeService.name}\n` +
      `• *Patient Full Name:* ${bookingForm.fullName}\n` +
      `• *Gender:* ${bookingForm.gender}\n` +
      `• *Phone Number:* +91 ${bookingForm.phone}\n` +
      `• *Patient Address:* ${bookingForm.address}\n` +
      `• *Pincode:* ${bookingForm.pincode}\n` +
      `• *Service Required Date:* ${bookingForm.date || 'Earliest Available'}\n` +
      `• *Time Slot:* ${bookingForm.timeSlot}\n` +
      `• *Number of Persons:* ${bookingForm.persons}\n` +
      `--------------------------------\n` +
      `_Sent via Nhealth Unified Healthcare Network_`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const waUrl = formatWhatsAppBookingUrl();
    setLastWhatsAppUrl(waUrl);
    setBookingSubmitted(true);
    // Instant redirect to WhatsApp
    window.location.href = waUrl;
  };

  if (currentPath === '/command-center') {
    return <AdminCommandCenter onBackToHome={() => navigate('/')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Banner */}
      <div className="bg-blue-900 text-blue-100 text-xs sm:text-sm py-2 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 mx-auto sm:mx-0 text-center sm:text-left">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span className="font-semibold text-slate-100 tracking-tight">
              Bharat Biggest Healthcare Network - Nhealth Unified & At-Home Healthcare
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-4 text-xs shrink-0">
            <span className="flex items-center gap-1 text-blue-200">
              <PhoneCall className="w-3.5 h-3.5 text-blue-300" />
              Direct Helpline: +91 9393934621
            </span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Header Brand Logo & Name */}
            <a href="#" className="flex items-center gap-2.5 sm:gap-3 group focus:outline-none">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 overflow-hidden shadow-xs shrink-0">
                <img
                  src="https://i.ibb.co/DPnzhmNM/Nhealth-logo-8cm-x-8cm-high-quality-3.png"
                  alt="Nhealth Logo"
                  className="w-full h-full object-contain p-0.5"
                  style={{ height: '38px', width: 'auto' }}
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (target.src !== 'https://i.ibb.co/qLw7Khzg/Nhealth-logo-8cm-x-8cm-high-quality-3.png') {
                      target.src = 'https://i.ibb.co/qLw7Khzg/Nhealth-logo-8cm-x-8cm-high-quality-3.png';
                    } else {
                      target.style.display = 'none';
                      const fallback = document.getElementById('navbar-logo-svg');
                      if (fallback) fallback.style.display = 'flex';
                    }
                  }}
                />
                <div
                  id="navbar-logo-svg"
                  style={{ display: 'none' }}
                  className="w-full h-full bg-blue-600 text-white items-center justify-center font-bold text-lg"
                >
                  <Activity className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-blue-950 font-sans flex items-center">
                  Nhealth<span className="text-blue-600">.</span>
                </span>
                <span className="text-[9px] sm:text-[10px] tracking-wider uppercase font-semibold text-slate-500 -mt-0.5 sm:-mt-1">
                  Unified Healthcare Network
                </span>
              </div>
            </a>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
              <a href="#services" className="hover:text-blue-600 transition-colors">Services</a>
              <a href="#booking-form" className="hover:text-blue-600 transition-colors">Book Appointment</a>
              <a href="#contact" className="hover:text-blue-600 transition-colors">Contact Us</a>
            </nav>

            {/* Desktop Action Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hello Nhealth Team, I would like to inquire about healthcare services.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span>WhatsApp Desk</span>
              </a>
              <button
                type="button"
                onClick={() => handleServiceSelect('careride')}
                className="px-4 py-2 text-sm font-bold text-amber-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 shadow-sm shadow-amber-500/25 rounded-lg transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
              >
                <Car className="w-4 h-4 text-amber-950" />
                <span>Book (Care Rider)</span>
              </button>
              <a
                href="#booking-form"
                className="px-4.5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 rounded-lg transition-all active:scale-[0.98]"
              >
                Book Now
              </a>
            </div>

            {/* Mobile Actions & Hamburger */}
            <div className="flex md:hidden items-center gap-2">
              <button
                type="button"
                onClick={() => handleServiceSelect('careride')}
                className="px-3 py-1.5 text-xs font-bold text-amber-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 rounded-lg shadow-xs flex items-center gap-1 active:scale-95 cursor-pointer"
              >
                <Car className="w-3.5 h-3.5" />
                <span>Book (Care Rider)</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 focus:outline-none"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-6 space-y-3">
            <nav className="flex flex-col space-y-2 text-base font-medium text-slate-700">
              <a
                href="#services"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-600"
              >
                Services
              </a>
              <a
                href="#booking-form"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-600"
              >
                Book Appointment
              </a>
              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-600"
              >
                Contact Us
              </a>
            </nav>
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleServiceSelect('careride');
                }}
                className="w-full py-2.5 text-center text-sm font-bold text-amber-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Car className="w-4 h-4" />
                <span>Book (Care Rider)</span>
              </button>
              <a
                href="#booking-form"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 text-center text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm"
              >
                Book Now
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-white to-slate-50 pt-2 pb-16 sm:pt-3 sm:pb-24 lg:pt-4 lg:pb-28">
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: `radial-gradient(#2563eb 0.75px, transparent 0.75px)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Continuous Moving Vehicles Animation (Between Header and Launch Announcement) */}
        <div className="relative w-full overflow-hidden pt-1 pb-2 sm:pb-3 mb-2 select-none pointer-events-none">
          <div className="absolute inset-x-0 bottom-2 sm:bottom-2.5 border-b border-dashed border-blue-200/80" />
          <div className="scooty-mover inline-flex items-end gap-5 sm:gap-7 md:gap-8 shrink-0">
            {/* Trailing Car (Behind Auto Rickshaw) */}
            <img
              src="/car-cutout.png"
              alt="nhealth Healthcare at Home Car"
              className="h-12 sm:h-16 md:h-20 w-auto object-contain drop-shadow-md shrink-0 block"
              loading="eager"
            />
            {/* Middle Auto Rickshaw */}
            <img
              src="/auto-cutout.png"
              alt="nhealth Auto Care Ride"
              className="h-12 sm:h-15 md:h-19 w-auto object-contain drop-shadow-md shrink-0 block"
              loading="eager"
            />
            {/* Leading Scooty (In Front) */}
            <img
              src="/scooty-cutout.png"
              alt="nhealth Home Healthcare Caregiver on Scooty"
              className="h-11 sm:h-14 md:h-18 w-auto object-contain drop-shadow-md shrink-0 block"
              loading="eager"
            />
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            
            {/* Left Column */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Launch Announcement Alert */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50/95 border border-blue-200/90 shadow-xs flex items-start sm:items-center gap-3.5 text-left">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
                  <Rocket className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                  <span className="font-bold text-blue-950 block sm:inline sm:mr-1.5">Launch Announcement:</span>
                  The fully automated Nhealth application will be launching shortly. To ensure uninterrupted care in the meantime, we have introduced this initial version to serve you better.
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                Welcome to <span className="text-blue-600">Bharat's Biggest</span> Unified Healthcare Network
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
                Interconnecting hospitals, clinics, verified practitioners, diagnostic labs, and digital health records under one secure national infrastructure.
              </p>

              {/* Quick Search / CTA Box */}
              <div className="pt-2 max-w-xl mx-auto lg:mx-0">
                <div className="p-2 sm:p-2.5 bg-white rounded-2xl shadow-lg shadow-blue-950/5 border border-slate-200/80 flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 flex items-center px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                    <Search className="w-5 h-5 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      placeholder="Find verified doctors, hospitals, or diagnostic labs..."
                      className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                  <a
                    href="#services"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span>Explore Services</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Right Column: Embedded Image Display */}
            <div className="lg:col-span-5 relative flex items-center justify-center">
              <div className="w-full max-w-lg mx-auto p-3 sm:p-4 bg-white rounded-3xl shadow-xl shadow-blue-900/10 border border-slate-200/80 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/15">
                <img
                  src="https://i.ibb.co/DPnzhmNM/Nhealth-logo-8cm-x-8cm-high-quality-3.png"
                  alt="nhealth Unified Healthcare Network"
                  className="w-full h-auto max-h-[460px] object-contain rounded-2xl mx-auto block"
                  loading="eager"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (target.src !== 'https://i.ibb.co/qLw7Khzg/Nhealth-logo-8cm-x-8cm-high-quality-3.png') {
                      target.src = 'https://i.ibb.co/qLw7Khzg/Nhealth-logo-8cm-x-8cm-high-quality-3.png';
                    } else {
                      target.style.display = 'none';
                      const fallback = document.getElementById('hero-display-fallback');
                      if (fallback) fallback.style.display = 'flex';
                    }
                  }}
                />
                <div
                  id="hero-display-fallback"
                  style={{ display: 'none' }}
                  className="w-full min-h-[300px] rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/70 border border-blue-200/60 p-8 flex flex-col items-center justify-center text-center gap-3"
                >
                  <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h3 className="font-extrabold text-blue-950 text-lg">nhealth Unified Network</h3>
                  <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
                    Connecting verified doctors, diagnostic laboratories, hospitals, and citizens across Bharat.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Services Section: Strict 4x4 Grid Format */}
      <section id="services" className="py-16 sm:py-20 bg-white border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-blue-600 bg-blue-50 px-3.5 py-1.5 rounded-full mb-3 border border-blue-100">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Healthcare Services Grid</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              Select Your Required Service
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              Click any of the 16 unified healthcare services below to instantly select and book.
            </p>
          </div>

          {/* Responsive Grid: 3 columns on Mobile, 4 columns on Tablet & Desktop */}
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-5">
            {services.map((service) => {
              const isSelected = selectedServiceId === service.id;

              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => handleServiceSelect(service.id)}
                  aria-pressed={isSelected}
                  className={`group relative text-left w-full rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 focus:outline-none ${
                    isSelected
                      ? 'ring-2 sm:ring-4 ring-blue-600 shadow-xl shadow-blue-500/25 scale-[1.02]'
                      : 'border border-slate-200/80 hover:border-blue-400 hover:shadow-lg hover:shadow-slate-300/60 hover:-translate-y-1'
                  }`}
                >
                  <img
                    src={service.img}
                    alt={service.name}
                    className="w-full h-auto block rounded-xl sm:rounded-2xl object-contain bg-white"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const fallback = parent.querySelector('.sprite-fallback') as HTMLElement;
                        if (fallback) fallback.style.display = 'block';
                      }
                    }}
                  />
                  <div
                    className="sprite-fallback hidden w-full aspect-[384/256] rounded-xl sm:rounded-2xl bg-slate-100"
                    style={{
                      backgroundImage: `url('https://i.ibb.co/gbq7HnhV/Nhealth-Healthcare-Services-Grid-1.png')`,
                      backgroundSize: '400% 400%',
                      backgroundPosition: `${(service.col / 3) * 100}% ${(service.row / 3) * 100}%`,
                      backgroundRepeat: 'no-repeat'
                    }}
                  />

                  {/* Active Selected State Badge */}
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 bg-blue-600 text-white text-[9px] sm:text-[11px] font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded-full shadow-lg flex items-center gap-1 backdrop-blur-xs">
                      <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span>Selected</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

        </div>
      </section>

      {/* Patient Booking Form Section */}
      <section id="booking-form" className="py-16 sm:py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-blue-600 bg-blue-100/60 px-3 py-1 rounded-full mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Priority Appointment Slot</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Patient Booking & Consultation
            </h2>
            <p className="mt-1 text-sm text-slate-600 max-w-xl mx-auto">
              Selected Service: <span className="font-semibold text-blue-700">{activeService.name}</span>. Complete the form to dispatch your details directly via WhatsApp.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-blue-900/5 p-6 sm:p-8 md:p-10">
            {bookingSubmitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Appointment Request Prepared!</h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Thank you, <span className="font-semibold text-slate-900">{bookingForm.fullName}</span> ({bookingForm.gender}). Your details for <span className="font-semibold text-blue-700">{activeService.name}</span> on <span className="font-semibold text-slate-900">{bookingForm.date || 'Earliest slot'}</span> have been formatted.
                </p>
                <div className="inline-block bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-xs text-emerald-800 font-medium">
                  Dispatching to Official WhatsApp: <span className="font-mono font-bold">+91 9393934621</span>
                </div>
                <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                  {lastWhatsAppUrl && (
                    <a
                      href={lastWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md transition-all active:scale-[0.98]"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                      </svg>
                      <span>Open WhatsApp Now</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setBookingSubmitted(false);
                      setBookingForm({
                        fullName: '',
                        gender: 'Male',
                        phone: '',
                        address: '',
                        pincode: '',
                        date: '',
                        timeSlot: 'Morning (08:00 AM - 12:00 PM)',
                        persons: '1',
                      });
                    }}
                    className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer"
                  >
                    Book Another Service
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleBookingSubmit}
                className="space-y-5"
              >
                {/* Active service indicator */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 font-medium">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    Selected Service: <strong className="text-blue-950 font-bold">{activeService.name}</strong>
                  </span>
                  <a href="#services" className="text-blue-600 hover:underline font-semibold">Change Service</a>
                </div>

                {/* 1. Full Name, 2. Gender & 3. Phone Number */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-5">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={bookingForm.fullName}
                        onChange={(e) => setBookingForm({ ...bookingForm, fullName: e.target.value })}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-800 placeholder-slate-400"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        required
                        value={bookingForm.gender}
                        onChange={(e) => setBookingForm({ ...bookingForm, gender: e.target.value })}
                        className="w-full px-3 py-2.5 text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-800 cursor-pointer"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-medium text-slate-500 border-r border-slate-200 pr-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>+91</span>
                      </div>
                      <input
                        type="tel"
                        required
                        pattern="[0-9]{10}"
                        maxLength={10}
                        value={bookingForm.phone}
                        onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value.replace(/\D/g, '') })}
                        placeholder="9876543210"
                        className="w-full pl-20 pr-3 py-2.5 text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-800 placeholder-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Address & 4. Pincode */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-8">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Address & Landmark <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={bookingForm.address}
                        onChange={(e) => setBookingForm({ ...bookingForm, address: e.target.value })}
                        placeholder="House / Flat No., Colony or Street"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-800 placeholder-slate-400"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      pattern="[0-9]{6}"
                      value={bookingForm.pincode}
                      onChange={(e) => setBookingForm({ ...bookingForm, pincode: e.target.value.replace(/\D/g, '') })}
                      placeholder="e.g. 110001"
                      className="w-full px-3 py-2.5 text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-800 placeholder-slate-400"
                    />
                  </div>
                </div>

                {/* 5. Service Required Date, 6. Time Slot & 7. Number of Persons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Service Required Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="date"
                        required
                        value={bookingForm.date}
                        onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Time Slot <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select
                        value={bookingForm.timeSlot}
                        onChange={(e) => setBookingForm({ ...bookingForm, timeSlot: e.target.value })}
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-800 cursor-pointer"
                      >
                        <option value="Morning (08:00 AM - 12:00 PM)">Morning (08:00 AM - 12:00 PM)</option>
                        <option value="Afternoon (12:00 PM - 04:00 PM)">Afternoon (12:00 PM - 04:00 PM)</option>
                        <option value="Evening (04:00 PM - 08:00 PM)">Evening (04:00 PM - 08:00 PM)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Number of Persons <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select
                        value={bookingForm.persons}
                        onChange={(e) => setBookingForm({ ...bookingForm, persons: e.target.value })}
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-800 cursor-pointer"
                      >
                        <option value="1">1 Person (Individual)</option>
                        <option value="2">2 Persons</option>
                        <option value="3">3 Persons</option>
                        <option value="4+">4+ Persons (Family Package)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Submit button with WhatsApp indicator */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Direct WhatsApp routing to +91 9393934621</span>
                  </div>

                  <button
                    type="submit"
                    className="w-full sm:w-auto px-8 py-3.5 bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                    </svg>
                    <span>Book Now</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>
      </section>

      {/* Contact Us Section (#0b192c Dark Blue Theme Palette) */}
      <section id="contact" className="py-16 sm:py-20 bg-[#0b192c] text-slate-100 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-blue-400 bg-blue-950/70 px-3.5 py-1.5 rounded-full mb-3 border border-blue-800/60">
              <Mail className="w-3.5 h-3.5" />
              <span>Get In Touch</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Contact <span className="text-blue-400">Nhealth</span> Support & Helpdesk
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-400">
              Direct assistance for patients, families, verified doctors, diagnostic laboratories, and hospital network partners across Bharat.
            </p>
          </div>

          {/* Centered Official Contact Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-10">
            {/* Corporate Email Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-7 flex flex-col items-center text-center shadow-xl hover:border-slate-700 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-blue-950/80 border border-blue-800/60 text-blue-400 flex items-center justify-center mb-4 shadow-inner">
                <Mail className="w-6 h-6" />
              </div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Corporate Email</div>
              <a
                href="mailto:support@nhealth.in"
                className="text-base sm:text-lg font-bold text-white hover:text-blue-400 transition-colors"
              >
                support@nhealth.in
              </a>
              <p className="mt-2 text-xs text-slate-400">Official inquiries, partnerships & support desk</p>
            </div>

            {/* Direct Emergency Helpline Card */}
            <div className="bg-slate-900/90 border border-blue-900/40 rounded-2xl p-6 sm:p-7 flex flex-col items-center text-center shadow-xl hover:border-blue-700/50 transition-all relative">
              <div className="w-12 h-12 rounded-2xl bg-blue-900/40 border border-blue-600/50 text-blue-300 flex items-center justify-center mb-4 shadow-inner">
                <Phone className="w-6 h-6" />
              </div>
              <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">Direct Helplines</div>
              <div className="space-y-1.5 w-full flex flex-col items-center">
                <a
                  href="tel:+919393934621"
                  className="text-base sm:text-lg font-bold text-white hover:text-blue-400 transition-colors inline-flex items-center gap-1.5"
                >
                  <span>+91 9393934621</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/70 text-blue-300 font-medium">Primary</span>
                </a>
                <a href="tel:+919581582220" className="text-sm font-semibold text-slate-300 hover:text-blue-400 transition-colors">
                  +91 9581582220
                </a>
                <a href="tel:+919393932969" className="text-sm font-semibold text-slate-300 hover:text-blue-400 transition-colors">
                  +91 9393932969
                </a>
              </div>
              <p className="mt-2 text-xs text-slate-400">24/7 Dispatch & Emergency Coordination</p>
            </div>

            {/* Corporate Address Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-7 flex flex-col items-center text-center shadow-xl hover:border-slate-700 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-blue-950/80 border border-blue-800/60 text-blue-400 flex items-center justify-center mb-4 shadow-inner">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Corporate Address</div>
              <p className="text-sm sm:text-base font-semibold text-white leading-snug">
                Nhealth Unified Healthcare Technologies Private Limited
              </p>
              <p className="mt-1 text-xs text-slate-400">Andhra Pradesh, India</p>
            </div>
          </div>

          {/* Centered Direct WhatsApp Callout Banner */}
          <div className="max-w-2xl mx-auto bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center shadow-2xl space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse"></span>
              <span>Instant WhatsApp Assistance</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              Connect With Nhealth Care Coordinators
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
              Get immediate responses for care rider dispatch, doctor consultations, lab tests, or hospital admission assistance across Bharat.
            </p>
            <div className="pt-2 flex justify-center">
              <a
                href="https://wa.me/919393934621?text=Hello%20Nhealth%20Team%2C%20I%20would%20like%20to%20connect%20with%20support."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-8 py-3.5 bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white font-bold text-sm sm:text-base rounded-xl transition-all shadow-lg shadow-emerald-500/20 inline-flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                <span>Connect on WhatsApp (+91 9393934621)</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Clean Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">Nhealth</span>
            <span>• Bharat's Biggest Unified Healthcare Network</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <a href="#services" className="hover:text-white transition-colors">Services</a>
            <a href="#booking-form" className="hover:text-white transition-colors">Book Now</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact Us</a>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} className="hover:text-emerald-400 transition-colors">Helpline +91 9393934621</a>
          </div>
        </div>
      </footer>

      {/* Floating Action Buttons Container (Bottom-Right) */}
      <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 md:bottom-6 md:right-6 z-50 flex flex-col items-end gap-2.5 sm:gap-3 md:gap-3.5">
        {/* Floating Purple Vital Lens Action Button */}
        <button
          type="button"
          onClick={() => setVitalLensOpen(true)}
          aria-label="Vital Lens"
          className="relative flex flex-col items-center justify-center w-13 h-13 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 animate-wa-bounce animate-purple-glow focus:outline-none focus:ring-4 focus:ring-purple-400/40 cursor-pointer border-2 border-purple-400/50"
        >
          <Heart className="w-4 h-4 sm:w-5 sm:h-5 md:w-5.5 md:h-5.5 fill-white text-white shrink-0 -mt-0.5" />
          <span className="font-extrabold text-[8.5px] sm:text-[9px] md:text-[9.5px] tracking-tight leading-tight text-center mt-0.5">
            Vital Lens
          </span>
        </button>

        {/* Floating WhatsApp Action Button */}
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
            'Hello Nhealth Support, I would like to inquire about healthcare services on the network.'
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
          className="relative flex items-center justify-center w-12 h-12 sm:w-13 sm:h-13 md:w-14 md:h-14 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 animate-wa-bounce animate-wa-glow focus:outline-none focus:ring-4 focus:ring-emerald-400/40 cursor-pointer"
        >
          <span className="absolute -top-1 -right-1 flex h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-80"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 bg-rose-600 text-[9px] md:text-[10px] font-bold text-white items-center justify-center shadow-xs">
              1
            </span>
          </span>

          <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 fill-current" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
          </svg>
        </a>
      </div>

      {/* Nhealth Vital Lens AI Modal (Part 1) */}
      <VitalLensModal
        isOpen={vitalLensOpen}
        onClose={() => setVitalLensOpen(false)}
      />
    </div>
  );
}
