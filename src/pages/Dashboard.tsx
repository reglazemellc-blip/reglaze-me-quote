// Dashboard.tsx — Workflow Hub with Embedded Calendar

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useClientsStore } from "@store/useClientsStore";
import { useQuotesStore } from "@store/useQuotesStore";
import { useInvoicesStore } from "@store/useInvoicesStore";
import { useConfigStore } from "@store/useConfigStore";
import { useCompaniesStore } from "@store/useCompaniesStore";
import { Calendar, ChevronLeft, ChevronRight, AlertCircle, Phone, DollarSign, Users, FileText, Clock, X } from "lucide-react";
import OnboardingWizard from "@components/OnboardingWizard";

export default function Dashboard() {
  const { clients, init: initClients } = useClientsStore();
  const { quotes, init: initQuotes } = useQuotesStore();
  const { invoices, init: initInvoices } = useInvoicesStore();
  const { companies, properties, init: initCompanies } = useCompaniesStore();
  const { config } = useConfigStore();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showGettingStarted, setShowGettingStarted] = useState(false);

  useEffect(() => {
    initClients();
    initQuotes();
    initInvoices();
    initCompanies();

    // Check if onboarding should be shown
    const onboardingComplete = localStorage.getItem('onboarding_complete');
    const onboardingSkipped = localStorage.getItem('onboarding_skipped');
    
    if (!onboardingComplete && !onboardingSkipped) {
      setShowOnboarding(true);
    } else if (onboardingSkipped && !onboardingComplete) {
      // Show getting started checklist if skipped but not completed
      const checklist = {
        businessInfo: !!config?.businessProfile?.companyName && !!config?.businessProfile?.email,
        logo: !!config?.businessProfile?.logo,
        firstClient: clients.length > 0,
        firstQuote: quotes.length > 0,
      };
      const allComplete = Object.values(checklist).every(Boolean);
      setShowGettingStarted(!allComplete);
    }
  }, [initClients, initQuotes, initInvoices, initCompanies]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    setShowGettingStarted(true);
  };

  const handleDismissGettingStarted = () => {
    setShowGettingStarted(false);
    localStorage.setItem('getting_started_dismissed', 'true');
  };

  // Clients that need contact
  const needsContact = useMemo(() => {
    return clients.filter((c) => !quotes.some((q) => q.clientId === c.id));
  }, [clients, quotes]);

  // Awaiting quote
  const awaitingQuote = useMemo(() => {
    const clientsWithUnsentQuotes = new Set<string>();
    quotes.forEach((q) => {
      if ((!q.workflowStatus || q.workflowStatus === "new") && q.clientId) {
        clientsWithUnsentQuotes.add(q.clientId);
      }
    });
    return clients.filter((c) => clientsWithUnsentQuotes.has(c.id));
  }, [clients, quotes]);

  // Follow Up
  const followUp = useMemo(() => {
    return quotes.filter((q) => {
      const status = q.workflowStatus;
      return status && status !== "new" && status !== "scheduled" && 
             status !== "in_progress" && status !== "completed" && 
             status !== "invoiced" && status !== "paid";
    });
  }, [quotes]);

  // Jobs this week
  const jobsThisWeek = useMemo(() => {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);

    return clients.filter((c) => {
      if (!c.scheduledDate) return false;
      const schedDate = new Date(c.scheduledDate);
      return schedDate >= startOfWeek && schedDate <= endOfWeek;
    }).length + quotes.filter((q) => {
      if (!q.scheduledDate) return false;
      const schedDate = new Date(q.scheduledDate);
      return schedDate >= startOfWeek && schedDate <= endOfWeek;
    }).length;
  }, [clients, quotes]);

  // Pending invoices
  const pendingInvoices = useMemo(() => {
    return invoices.filter((inv) => inv.status !== 'paid');
  }, [invoices]);

  // Calendar month data
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const days = [];

    for (let i = 0; i < startPadding; i++) {
      days.push({ day: null, jobs: [] });
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayJobs: any[] = [];

      clients.forEach((c) => {
        if (c.scheduledDate === dateStr) {
          dayJobs.push({ name: c.name, link: `/clients/${c.id}`, time: c.scheduledTime });
        }
      });

      quotes.forEach((q) => {
        if (q.scheduledDate === dateStr) {
          const client = clients.find((c) => c.id === q.clientId);
          if (!dayJobs.find((j) => j.link === `/clients/${client?.id}`)) {
            dayJobs.push({ name: q.clientName || client?.name, link: `/quotes/${q.id}`, time: q.scheduledTime });
          }
        }
      });

      days.push({ day, jobs: dayJobs });
    }

    return days;
  }, [currentDate, clients, quotes]);

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Onboarding Wizard */}
      {showOnboarding && (
        <OnboardingWizard 
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}

      {/* Getting Started Checklist */}
      {showGettingStarted && !showOnboarding && (
        <div className="bg-[#2a2414] border border-[#e8d487]/30 rounded-xl p-6 relative">
          <button
            onClick={handleDismissGettingStarted}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
          >
            <X size={20} />
          </button>
          
          <h3 className="text-lg font-semibold text-[#e8d487] mb-3">Getting Started</h3>
          <p className="text-sm text-gray-400 mb-4">Complete these steps to get the most out of your workspace</p>
          
          <div className="space-y-2">
            <ChecklistItem 
              completed={!!config?.businessProfile?.companyName && !!config?.businessProfile?.email}
              label="Add business information"
              link="/settings"
            />
            <ChecklistItem 
              completed={!!config?.businessProfile?.logo}
              label="Upload your logo"
              link="/settings"
            />
            <ChecklistItem 
              completed={clients.length > 0}
              label="Create your first client"
              link="/clients"
            />
            <ChecklistItem 
              completed={quotes.length > 0}
              label="Create your first quote"
              link="/quotes/new"
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#e8d487]">
            {config?.labels?.dashboardTitle || "Dashboard"}
          </h2>
          <p className="text-sm text-gray-400">Your workflow hub</p>
        </div>
        <div className="flex gap-3">
          <Link to="/clients" state={{ openClientDrawer: true }} className="btn-gold">
            + New Client
          </Link>
          <Link to="/quotes/new" className="btn-gold">
            + New Quote
          </Link>
        </div>
      </div>

      {/* Quick Actions Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/clients" className="bg-black/40 border border-[#2a2414] rounded-xl p-4 hover:bg-black/50 transition group">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-[#e8d487]" size={20} />
            <span className="text-sm text-gray-400">Total Clients</span>
          </div>
          <div className="text-3xl font-bold text-white">{clients.length}</div>
        </Link>

        <div className="bg-black/40 border border-[#2a2414] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="text-[#e8d487]" size={20} />
            <span className="text-sm text-gray-400">Jobs This Week</span>
          </div>
          <div className="text-3xl font-bold text-white">{jobsThisWeek}</div>
        </div>

        <Link to="/quotes" className="bg-black/40 border border-[#2a2414] rounded-xl p-4 hover:bg-black/50 transition">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="text-[#e8d487]" size={20} />
            <span className="text-sm text-gray-400">Total Quotes</span>
          </div>
          <div className="text-3xl font-bold text-white">{quotes.length}</div>
        </Link>

        <Link to="/invoices" className="bg-black/40 border border-[#2a2414] rounded-xl p-4 hover:bg-black/50 transition">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="text-[#e8d487]" size={20} />
            <span className="text-sm text-gray-400">Pending Invoices</span>
          </div>
          <div className="text-3xl font-bold text-white">{pendingInvoices.length}</div>
        </Link>
      </section>

      {/* Action Required */}
      <section className="bg-black/40 border border-[#2a2414] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="text-[#e8d487]" size={24} />
          <h3 className="text-xl font-semibold text-[#e8d487]">Action Required</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Needs Contact */}
          <div className="bg-black/30 border border-[#2a2414] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-white">Needs Contact</h4>
              <span className="px-2 py-1 bg-red-900/30 text-red-400 text-xs rounded-full border border-red-700/30">
                {needsContact.length}
              </span>
            </div>
            {needsContact.length === 0 ? (
              <p className="text-sm text-gray-500">All caught up!</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {needsContact.slice(0, 5).map((client) => (
                  <Link key={client.id} to={`/clients/${client.id}`} className="block text-sm text-gray-300 hover:text-[#e8d487] transition">
                    {client.name}
                    {client.createdAt && (
                      <span className="text-xs text-gray-500 ml-2">
                        {Math.floor((Date.now() - client.createdAt) / (1000 * 60 * 60 * 24))}d ago
                      </span>
                    )}
                  </Link>
                ))}
                {needsContact.length > 5 && (
                  <Link to="/clients" className="text-xs text-[#e8d487] hover:underline">
                    View all {needsContact.length} →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Awaiting Quote */}
          <div className="bg-black/30 border border-[#2a2414] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-white">Awaiting Quote</h4>
              <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 text-xs rounded-full border border-yellow-700/30">
                {awaitingQuote.length}
              </span>
            </div>
            {awaitingQuote.length === 0 ? (
              <p className="text-sm text-gray-500">All caught up!</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {awaitingQuote.slice(0, 5).map((client) => (
                  <Link key={client.id} to={`/clients/${client.id}`} className="block text-sm text-gray-300 hover:text-[#e8d487] transition">
                    {client.name}
                  </Link>
                ))}
                {awaitingQuote.length > 5 && (
                  <Link to="/clients" className="text-xs text-[#e8d487] hover:underline">
                    View all {awaitingQuote.length} →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Follow Up */}
          <div className="bg-black/30 border border-[#2a2414] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-white">Follow Up</h4>
              <span className="px-2 py-1 bg-blue-900/30 text-blue-400 text-xs rounded-full border border-blue-700/30">
                {followUp.length}
              </span>
            </div>
            {followUp.length === 0 ? (
              <p className="text-sm text-gray-500">All caught up!</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {followUp.slice(0, 5).map((quote) => {
                  const client = clients.find((c) => c.id === quote.clientId);
                  return (
                    <Link key={quote.id} to={`/quotes/${quote.id}`} className="block text-sm text-gray-300 hover:text-[#e8d487] transition">
                      {client?.name || "Unknown Client"}
                    </Link>
                  );
                })}
                {followUp.length > 5 && (
                  <Link to="/quotes" className="text-xs text-[#e8d487] hover:underline">
                    View all {followUp.length} →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Calendar */}
      <section className="bg-black/40 border border-[#2a2414] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="text-[#e8d487]" size={24} />
            <h3 className="text-xl font-semibold text-[#e8d487]">{monthName}</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              className="p-2 hover:bg-black/30 rounded transition"
            >
              <ChevronLeft size={20} className="text-gray-400" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm text-gray-400 hover:text-[#e8d487] transition"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              className="p-2 hover:bg-black/30 rounded transition"
            >
              <ChevronRight size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-xs text-gray-500 font-semibold p-2">
              {day}
            </div>
          ))}
          {calendarDays.map((dayData, idx) => (
            <div
              key={idx}
              className={`min-h-[80px] p-2 rounded-lg border ${
                dayData.day ? 'border-[#2a2414] bg-black/20' : 'border-transparent'
              } ${dayData.jobs.length > 0 ? 'bg-[#e8d487]/10 border-[#e8d487]/30' : ''}`}
            >
              {dayData.day && (
                <>
                  <div className="text-sm text-gray-400 mb-1">{dayData.day}</div>
                  <div className="space-y-1">
                    {dayData.jobs.map((job: any, jidx: number) => (
                      <Link
                        key={jidx}
                        to={job.link}
                        className="block text-xs text-[#e8d487] hover:text-white transition truncate"
                      >
                        {job.time && <Clock size={10} className="inline mr-1" />}
                        {job.name}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// Helper component for getting started checklist
function ChecklistItem({ completed, label, link }: { completed: boolean; label: string; link: string }) {
  return (
    <Link 
      to={link}
      className="flex items-center gap-3 p-3 bg-black/30 rounded-lg hover:bg-black/40 transition group"
    >
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
        completed ? 'bg-[#e8d487] border-[#e8d487]' : 'border-gray-500'
      }`}>
        {completed && (
          <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={`text-sm ${completed ? 'text-gray-400 line-through' : 'text-gray-300 group-hover:text-[#e8d487]'}`}>
        {label}
      </span>
    </Link>
  );
}
