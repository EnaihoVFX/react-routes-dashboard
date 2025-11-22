import React, { useState, useEffect, useRef } from 'react';
import { Mic, Play, Pause, CheckCircle, Trash2, Plus, Clock, Send, DollarSign, User, ShieldCheck, ArrowLeft, FileText, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Agent = () => {
  // App States: 'start', 'working', 'summary', 'invoice-sent'
  const [view, setView] = useState('start');
  const [isListening, setIsListening] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const navigate = useNavigate();
  
  // Data States
  const [transcript, setTranscript] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [customerStatus, setCustomerStatus] = useState("Waiting to start...");

  // Scroll refs to auto-scroll lists
  const transcriptEndRef = useRef(null);
  const invoiceEndRef = useRef(null);

  const scrollToBottom = () => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    invoiceEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [transcript, invoiceItems]);

  // --- SIMULATION LOGIC (The "AI" Brain) ---
  const handleVoiceInput = (text, actionType, data) => {
    // 1. Update Transcript
    setTranscript(prev => [...prev, { text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    
    // 2. Update Customer Status (Simulated transparency)
    if (text.toLowerCase().includes("checking") || text.toLowerCase().includes("diagnosing")) {
      setCustomerStatus("Technician is diagnosing the issue...");
    } else if (text.toLowerCase().includes("installing") || text.toLowerCase().includes("replacing")) {
      setCustomerStatus("Technician is replacing parts...");
    }

    // 3. Update Invoice Logic
    if (actionType === 'add_item') {
      setInvoiceItems(prev => [...prev, { id: Date.now(), ...data }]);
    } 
    else if (actionType === 'add_labor') {
      setInvoiceItems(prev => [...prev, { id: Date.now(), name: 'Labor (1 Hour)', price: 85, type: 'labor' }]);
    }
    else if (actionType === 'remove_last') {
       setInvoiceItems(prev => prev.slice(0, -1)); // Removes last item
    }
    else if (actionType === 'make_free') {
       setInvoiceItems(prev => {
         const newItems = [...prev];
         if(newItems.length > 0) newItems[newItems.length - 1].price = 0;
         return newItems;
       });
    }
    else if (actionType === 'finish') {
      setTimeout(() => setView('summary'), 1000);
    }
  };

  // Calculate Total
  const total = invoiceItems.reduce((sum, item) => sum + item.price, 0);

  // --- VIEW: 1. START JOB ---
  if (view === 'start') {
    return (
      <div className="min-h-screen bg-[#171821] text-white flex flex-col items-center justify-center p-4 sm:p-6 font-sans max-w-md mx-auto relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#7c4dff]/20 to-[#171821] z-0"></div>
        
        <div className="z-10 flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-[#7c4dff] rounded-full flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(124,77,255,0.5)] animate-pulse">
            <Mic size={40} className="text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Job #4092</h1>
          <p className="text-gray-400 mb-8 text-sm sm:text-base">Customer: John Doe • 2018 Ford Focus</p>
          
          <button 
            onClick={() => { setView('working'); setIsListening(true); }}
            className="bg-white text-[#171821] px-8 py-4 rounded-2xl font-bold text-base sm:text-lg flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <Play size={20} fill="currentColor" />
            Start Job with AI
          </button>
        </div>
      </div>
    );
  }

  // --- VIEW: 3. SUMMARY (FINISH) ---
  if (view === 'summary') {
    return (
      <div className="min-h-screen bg-[#171821] text-white p-4 sm:p-6 font-sans max-w-md mx-auto flex flex-col">
        <header className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-[#00E096] flex items-center gap-2">
            <CheckCircle /> Job Complete
          </h1>
          <p className="text-gray-400 text-sm">Review Invoice Draft</p>
        </header>

        <div className="flex-1 bg-[#21222D] rounded-2xl p-4 sm:p-6 mb-4 overflow-y-auto">
          <h2 className="text-base sm:text-lg font-semibold mb-4 border-b border-[#2b2c3b] pb-2">Invoice Summary</h2>
          
          {invoiceItems.length === 0 ? (
            <div className="border-2 border-dashed border-[#2b2c3b] rounded-xl h-32 flex items-center justify-center text-gray-600 text-sm">
              No items recorded.
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {invoiceItems.map((item) => (
                  <div key={item.id} className="bg-[#171821] border border-[#2b2c3b] p-4 rounded-xl flex justify-between items-center">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${item.type === 'part' ? 'bg-[#7c4dff]/20 text-[#7c4dff]' : 'bg-orange-500/20 text-orange-400'}`}>
                        {item.type === 'part' ? <Plus size={18}/> : <Clock size={18}/>}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm sm:text-base">{item.name}</h4>
                        <p className="text-xs text-gray-400 capitalize">{item.type}</p>
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <span className="font-bold text-lg">
                        {item.price === 0 ? (
                          <span className="text-[#00E096] text-sm">FREE</span>
                        ) : (
                          `$${item.price}`
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-4 border-t border-[#2b2c3b]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm">Items: {invoiceItems.length}</span>
                  <span className="text-gray-400 text-sm">Subtotal: ${total}</span>
                </div>
                <div className="flex justify-between items-end pt-2">
                  <span className="text-gray-300 text-base sm:text-lg font-semibold">Total Due</span>
                  <span className="text-2xl sm:text-3xl font-bold text-[#7c4dff]">${total}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button className="bg-[#21222D] py-3 rounded-xl font-medium text-sm sm:text-base" onClick={() => setView('working')}>Resume Work</button>
          <button 
            className="bg-[#7c4dff] py-3 rounded-xl font-medium text-sm sm:text-base flex items-center justify-center gap-2 hover:bg-[#6d3fef] transition-colors"
            onClick={() => {
              setIsAnimating(true);
              setTimeout(() => {
                setView('invoice-sent');
                setIsAnimating(false);
              }, 500);
            }}
          >
            <Send size={18} /> Approve & Send
          </button>
        </div>
      </div>
    );
  }

  // --- VIEW: 4. INVOICE SENT (SUCCESS) ---
  if (view === 'invoice-sent') {
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    return (
      <div className={`min-h-screen bg-[#171821] text-white p-4 sm:p-6 font-sans max-w-md mx-auto flex flex-col ${isAnimating ? 'animate-fade-out' : 'animate-fade-in'}`}>
        {/* Success Animation Header */}
        <div className="flex flex-col items-center justify-center mb-8 mt-8">
          <div className="relative mb-6">
            <div className="w-24 h-24 bg-[#00E096] rounded-full flex items-center justify-center animate-scale-in shadow-[0_0_40px_rgba(0,224,150,0.5)]">
              <CheckCircle size={48} className="text-[#171821]" />
            </div>
            <div className="absolute inset-0 bg-[#00E096] rounded-full animate-ping opacity-20"></div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#00E096] mb-2">Invoice Sent!</h1>
          <p className="text-gray-400 text-sm sm:text-base text-center">Invoice #{invoiceNumber} has been sent to the customer</p>
        </div>

        {/* Invoice Details Card */}
        <div className="flex-1 bg-[#21222D] rounded-2xl p-4 sm:p-6 mb-6 animate-slide-up">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[#2b2c3b]">
            <FileText className="text-[#7c4dff]" size={20} />
            <h2 className="text-lg sm:text-xl font-bold">Invoice Details</h2>
          </div>

          {/* Invoice Info */}
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Invoice Number</span>
              <span className="font-mono font-semibold">{invoiceNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Date</span>
              <span className="font-medium">{currentDate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Customer</span>
              <span className="font-medium">John Doe</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Vehicle</span>
              <span className="font-medium">2018 Ford Focus</span>
            </div>
          </div>

          {/* Items List */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase">Items</h3>
            <div className="space-y-2">
              {invoiceItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-[#2b2c3b] last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-gray-500 uppercase">{item.type}</p>
                  </div>
                  <span className="font-mono font-semibold">
                    {item.price === 0 ? <span className="text-[#00E096] text-xs">FREE</span> : `$${item.price}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="pt-4 border-t border-[#2b2c3b]">
            <div className="flex justify-between items-end mb-2">
              <span className="text-gray-400">Subtotal</span>
              <span className="font-mono">${total}</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl sm:text-3xl font-bold text-[#7c4dff]">${total}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full bg-[#7c4dff] py-4 rounded-xl font-medium text-base flex items-center justify-center gap-2 hover:bg-[#6d3fef] transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
          <button 
            onClick={() => {
              setView('start');
              setTranscript([]);
              setInvoiceItems([]);
              setCustomerStatus("Waiting to start...");
            }}
            className="w-full bg-[#21222D] py-3 rounded-xl font-medium text-sm hover:bg-[#2b2c3b] transition-colors"
          >
            Start New Job
          </button>
        </div>
      </div>
    );
  }

  // --- VIEW: 2. LIVE WORK SCREEN (MAIN UI) ---
  return (
    <div className="h-screen bg-[#171821] text-white font-sans flex flex-col relative max-w-md mx-auto">
      
      {/* Header & Customer Status */}
      <header className="bg-[#21222D]/50 backdrop-blur-md p-4 border-b border-[#2b2c3b] z-20 flex justify-between items-start">
        <div>
            <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Live Recording</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#00E096] text-xs bg-[#00E096]/10 px-2 py-1 rounded-full border border-[#00E096]/20">
                <ShieldCheck size={12} />
                {customerStatus}
            </div>
        </div>
        <button onClick={() => handleVoiceInput("I'm done.", 'finish')} className="text-xs bg-[#21222D] hover:bg-[#2b2c3b] px-3 py-1 rounded-lg">
            End Job
        </button>
      </header>

      {/* TOP SECTION: TRANSCRIPT (35% Height) */}
      <div className="flex-none h-[35%] bg-[#171821] p-4 overflow-y-auto border-b border-[#2b2c3b]">
        <h3 className="text-gray-500 text-xs uppercase font-bold mb-2 sticky top-0 bg-[#171821] py-1">Live Transcript</h3>
        <div className="space-y-3">
          {transcript.length === 0 && <p className="text-gray-600 italic text-sm">Listening for activity...</p>}
          {transcript.map((t, i) => (
            <div key={i} className="animate-fade-in-up">
               <p className="text-[#7c4dff] text-sm leading-relaxed">"{t.text}"</p>
               <span className="text-[10px] text-gray-600">{t.timestamp}</span>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
      </div>

      {/* BOTTOM SECTION: INVOICE CARDS (Remaining Height) */}
      <div className="flex-1 bg-[#171821] p-4 overflow-y-auto relative">
        <div className="sticky top-0 z-10 bg-[#171821] pb-2 flex justify-between items-center">
             <h3 className="text-gray-500 text-xs uppercase font-bold">Detected Items</h3>
             <span className="text-[#7c4dff] text-sm font-bold">Total: ${total}</span>
        </div>
        
        <div className="space-y-3 pb-32"> 
          {invoiceItems.length === 0 && (
             <div className="border-2 border-dashed border-[#2b2c3b] rounded-xl h-32 flex items-center justify-center text-gray-600 text-sm">
                Mention parts or labor to add items
             </div>
          )}
          
          {invoiceItems.map((item) => (
            <div key={item.id} className="bg-[#21222D] border border-[#2b2c3b] p-4 rounded-xl flex justify-between items-center shadow-lg animate-slide-in-right">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${item.type === 'part' ? 'bg-[#7c4dff]/20 text-[#7c4dff]' : 'bg-orange-500/20 text-orange-400'}`}>
                    {item.type === 'part' ? <Plus size={18}/> : <Clock size={18}/>}
                </div>
                <div>
                  <h4 className="font-medium text-sm">{item.name}</h4>
                  <p className="text-xs text-gray-400 capitalize">{item.type}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold text-lg">
                    {item.price === 0 ? <span className="text-[#00E096] text-sm">FREE</span> : `$${item.price}`}
                </span>
              </div>
            </div>
          ))}
          <div ref={invoiceEndRef} />
        </div>
      </div>

      {/* --- SIMULATION CONTROLS (For Demo Purposes) --- */}
      <div className="absolute bottom-0 w-full bg-[#21222D] border-t border-[#2b2c3b] p-3 z-50 max-w-md">
        <p className="text-[10px] text-gray-400 mb-2 text-center uppercase tracking-widest">Simulation Controls (Click to Speak)</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
            <SimButton 
                label="Checking..." 
                onClick={() => handleVoiceInput("Checking the engine bay...", "none")} 
            />
            <SimButton 
                label="+ Mount ($45)" 
                color="blue"
                onClick={() => handleVoiceInput("Installing new engine mount. $45 part.", "add_item", {name: "Engine Mount", price: 45, type: "part"})} 
            />
            <SimButton 
                label="+ Labor" 
                color="orange"
                onClick={() => handleVoiceInput("Adding one hour of labor.", "add_labor")} 
            />
            <SimButton 
                label="Remove Last" 
                color="red"
                onClick={() => handleVoiceInput("Actually, remove that last part.", "remove_last")} 
            />
             <SimButton 
                label="Make Free" 
                color="green"
                onClick={() => handleVoiceInput("Don't charge for that.", "make_free")} 
            />
            <SimButton 
                label="Finish Job" 
                color="white"
                onClick={() => handleVoiceInput("Okay, I'm done with the job.", "finish")} 
            />
        </div>
      </div>
    </div>
  );
};

const SimButton = ({ label, onClick, color = "gray" }) => {
    const colors = {
        gray: "bg-[#21222D] hover:bg-[#2b2c3b]",
        blue: "bg-[#7c4dff] hover:bg-[#6d3fef]",
        orange: "bg-orange-600 hover:bg-orange-500",
        red: "bg-red-600 hover:bg-red-500",
        green: "bg-[#00E096] hover:bg-[#00c884] text-[#171821]",
        white: "bg-white text-[#171821] hover:bg-gray-200"
    };
    return (
        <button 
            onClick={onClick}
            className={`${colors[color]} text-xs px-3 py-2 rounded-lg whitespace-nowrap transition-colors font-medium`}
        >
            {label}
        </button>
    )
}

export default Agent;
