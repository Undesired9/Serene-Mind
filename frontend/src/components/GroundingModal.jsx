
import React, { useState } from 'react';
import { X, Heart, Hand, Eye, Sparkles } from 'lucide-react';

const GroundingModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "5 Things You Can See",
      items: ["Look around you and find 5 things you can see", "Say them out loud or in your head"],
      icon: <Eye className="w-12 h-12 text-sky-500" />
    },
    {
      title: "4 Things You Can Touch",
      items: ["Find 4 things you can touch", "Notice how they feel"],
      icon: <Hand className="w-12 h-12 text-emerald-500" />
    },
    {
      title: "3 Things You Can Hear",
      items: ["Listen for 3 things you can hear", "Let them ground you in the present"],
      icon: <Sparkles className="w-12 h-12 text-amber-500" />
    },
    {
      title: "2 Things You Can Smell",
      items: ["Notice 2 things you can smell", "Take a deep breath in"],
      icon: <Heart className="w-12 h-12 text-rose-500" />
    },
    {
      title: "1 Thing You Can Taste",
      items: ["Notice 1 thing you can taste", "Take a sip of water if you have it"],
      icon: <Heart className="w-12 h-12 text-indigo-500" />
    }
  ];

  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
      setStep(0);
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#0D1B2A]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-[#0D1B2A]">Grounding Exercise</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-[#3D5A80]" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-col items-center text-center space-y-6">
            {steps[step].icon}
            
            <div>
              <h3 className="text-xl font-semibold text-[#0D1B2A] mb-2">
                {steps[step].title}
              </h3>
              
              <div className="space-y-2 text-[#3D5A80]">
                {steps[step].items.map((item, i) => (
                  <p key={i} className="text-sm">{item}</p>
                ))}
              </div>
            </div>

            <div className="flex gap-2 w-full justify-center">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-2 h-2 rounded-full transition-all ${i <= step ? 'bg-[#0E7C7B]' : 'bg-gray-200'}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex border-t border-gray-100">
          {step > 0 && (
            <button 
              onClick={prevStep} 
              className="flex-1 p-4 text-[#3D5A80] hover:bg-gray-50 transition-colors font-medium"
            >
              Back
            </button>
          )}
          <button 
            onClick={nextStep} 
            className="flex-1 p-4 bg-[#0E7C7B] hover:bg-[#0A5E5D] text-white font-semibold transition-colors"
          >
            {step === steps.length - 1 ? "Complete" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroundingModal;
