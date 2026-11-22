"use client";

import React, { useState, useEffect } from "react";
import { formatISTDate, formatISTDateTime } from "@/lib/timezone";
import {
  Stethoscope,
  Activity,
  Plus,
  Trash2,
  Printer,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  FileText,
  Clock,
  Calendar,
  Lock,
  Sparkles
} from "lucide-react";

// Most used general practice medicines in Maharashtra (Clean names without Tab/Cap/Syp prefix)
export const COMMON_MEDICINES = [
  {
    name: "Paracetamol",
    strength: "650mg",
    frequency: "१-०-१ (सकाळ - संध्याकाळ जेवणानंतर)"
  },
  {
    name: "Dolo",
    strength: "650mg",
    frequency: "गरज असेल तेव्हा (त्रास झाल्यास / SOS)"
  },
  {
    name: "Pantoprazole",
    strength: "40mg",
    frequency: "१-०-० (सकाळी उपाशीपोटी / जेवणाआधी)"
  },
  {
    name: "Pan-D",
    strength: "40mg/30mg",
    frequency: "१-०-० (सकाळी उपाशीपोटी / जेवणाआधी)"
  },
  {
    name: "Zerodol-P",
    strength: "100mg/325mg",
    frequency: "१-०-१ (सकाळ - संध्याकाळ जेवणानंतर)"
  },
  {
    name: "Combiflam",
    strength: "400mg/325mg",
    frequency: "१-०-१ (सकाळ - संध्याकाळ जेवणानंतर)"
  },
  {
    name: "Augmentin (Amoxyclav)",
    strength: "625mg",
    frequency: "१-०-१ (सकाळ - संध्याकाळ जेवणानंतर)"
  },
  {
    name: "Azithromycin (Azee)",
    strength: "500mg",
    frequency: "१-०-० (फक्त दुपारी जेवणानंतर)"
  },
  {
    name: "Cefixime (Zifi)",
    strength: "200mg",
    frequency: "१-०-१ (सकाळ - संध्याकाळ जेवणानंतर)"
  },
  {
    name: "Cetirizine (Cetzine)",
    strength: "10mg",
    frequency: "०-०-१ (रात्री झोपताना जेवणानंतर)"
  },
  {
    name: "Montair-LC",
    strength: "10mg/5mg",
    frequency: "०-०-१ (रात्री झोपताना जेवणानंतर)"
  },
  {
    name: "Metrogyl",
    strength: "400mg",
    frequency: "१-०-१ (सकाळ - संध्याकाळ जेवणानंतर)"
  },
  {
    name: "Ondansetron (Emeset)",
    strength: "4mg",
    frequency: "गरज असेल तेव्हा (त्रास झाल्यास / SOS)"
  },
  {
    name: "Ranitidine (Rantac)",
    strength: "150mg",
    frequency: "१-०-१ (सकाळ - संध्याकाळ जेवणाआधी)"
  },
  {
    name: "Telmisartan (Telma)",
    strength: "40mg",
    frequency: "१-०-० (सकाळी नाश्त्यानंतर / जेवणानंतर)"
  },
  {
    name: "Amlodipine (Amlong)",
    strength: "5mg",
    frequency: "०-०-१ (रात्री झोपताना जेवणानंतर)"
  },
  {
    name: "Glycomet (Metformin)",
    strength: "500mg",
    frequency: "१-०-१ (सकाळ - संध्याकाळ जेवणानंतर)"
  },
  {
    name: "Becosules Z",
    strength: "",
    frequency: "०-१-० (फक्त दुपारी जेवणानंतर)"
  },
  {
    name: "Ascoril-D",
    strength: "100ml",
    frequency: "१-१-१ (सकाळ - दुपार - संध्याकाळ जेवणानंतर)"
  },
  {
    name: "Grilinctus",
    strength: "100ml",
    frequency: "१-१-१ (सकाळ - दुपार - संध्याकाळ जेवणानंतर)"
  },
  {
    name: "Electral (ORS)",
    strength: "1 Packet",
    frequency: "दिवसभरात थोडे थोडे (पाण्यात मिसळून)"
  },
  {
    name: "Oflox-OZ",
    strength: "200mg/500mg",
    frequency: "१-०-१ (सकाळ - संध्याकाळ जेवणानंतर)"
  },
  {
    name: "Meftal-Spas",
    strength: "",
    frequency: "गरज असेल तेव्हा (त्रास झाल्यास / SOS)"
  },
  {
    name: "Zerodol-SP",
    strength: "100mg/325mg/15mg",
    frequency: "१-०-१ (सकाळ - संध्याकाळ जेवणानंतर)"
  },
  {
    name: "Allegra (Fexofenadine)",
    strength: "120mg",
    frequency: "०-०-१ (रात्री झोपताना जेवणानंतर)"
  },
  {
    name: "Neurobion Forte",
    strength: "",
    frequency: "०-०-१ (रात्री झोपताना जेवणानंतर)"
  },
  {
    name: "Shelcal 500",
    strength: "500mg",
    frequency: "०-१-० (फक्त दुपारी जेवणानंतर)"
  },
  {
    name: "Zedex",
    strength: "100ml",
    frequency: "१-१-१ (सकाळ - दुपार - संध्याकाळ जेवणानंतर)"
  },
  {
    name: "Betadine Ointment",
    strength: "5%",
    frequency: "दिवसातून २ वेळा (सकाळ - संध्याकाळ)"
  },
  {
    name: "Ciplox Drops",
    strength: "0.3%",
    frequency: "दिवसातून ३ वेळा (सकाळ - दुपार - संध्याकाळ)"
  }
];

// Marathi Frequencies List (सकाळ, दुपार, संध्याकाळ, जेवणानंतर, उपाशीपोटी)
export const MARATHI_FREQUENCIES = [
  "१-०-१ (सकाळ - संध्याकाळ जेवणानंतर)",
  "१-०-० (सकाळी उपाशीपोटी / जेवणाआधी)",
  "१-०-० (फक्त सकाळी जेवणानंतर)",
  "०-०-१ (रात्री झोपताना जेवणानंतर)",
  "०-०-१ (रात्री झोपताना)",
  "०-१-० (फक्त दुपारी जेवणानंतर)",
  "१-१-१ (सकाळ - दुपार - संध्याकाळ जेवणानंतर)",
  "१-०-१ (सकाळ - संध्याकाळ जेवणाआधी)",
  "१-१-१ (सकाळ - दुपार - संध्याकाळ जेवणाआधी)",
  "गरज असेल तेव्हा (त्रास झाल्यास / SOS)",
  "दिवसातून २ वेळा (सकाळ - संध्याकाळ जेवणानंतर)",
  "दिवसातून ३ वेळा (सकाळ - दुपार - संध्याकाळ जेवणानंतर)",
  "दिवसभरात थोडे थोडे (पाण्यात मिसळून)"
];

interface ConsultationWorkspaceProps {
  visit: any;
  onBack: () => void;
  onRefresh: () => void;
  onPrintPrescription: (prescData: any) => void;
  currentUserRole?: string;
  currentUserId?: string;
}

interface MedicineRow {
  medicineName: string;
  strength: string;
  frequency: string;
  duration: string;
  dosage?: string;
  instructions?: string;
}

export function ConsultationWorkspace({
  visit,
  onBack,
  onRefresh,
  onPrintPrescription,
  currentUserRole = "DOCTOR",
  currentUserId = ""
}: ConsultationWorkspaceProps) {
  // Always permit doctor consultation actions when accessing doctor workspace
  const isDoctor = currentUserRole === "DOCTOR" || currentUserRole === "ADMINISTRATOR";

  // Vitals State
  const [bpSys, setBpSys] = useState<string>("");
  const [bpDia, setBpDia] = useState<string>("");
  const [pulse, setPulse] = useState<string>("");
  const [temp, setTemp] = useState<string>("");
  const [spo2, setSpo2] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [height, setHeight] = useState<string>("");

  // Clinical Notes State (Optional per prompt, no asterisk, no explicit "optional" written)
  const [chiefComplaint, setChiefComplaint] = useState(visit.reasonForVisit || "");
  const [hpi, setHpi] = useState("");
  const [findings, setFindings] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [advice, setAdvice] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  // Prescription Medicines State (Clean without Tab prefix, no dosage/instruction box)
  const [medicines, setMedicines] = useState<MedicineRow[]>([
    {
      medicineName: "Paracetamol",
      strength: "650mg",
      frequency: "१-०-१ (सकाळ - संध्याकाळ जेवणानंतर)",
      duration: "५ दिवस"
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [existingConsultation, setExistingConsultation] = useState<any | null>(null);

  // Load existing consultation if already created
  useEffect(() => {
    async function loadConsultation() {
      if (!visit?.id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/consultations?opdVisitId=${visit.id}`, {
          headers: {
            "x-user-role": currentUserRole || "DOCTOR",
            "x-user-id": currentUserId || ""
          }
        });
        const json = await res.json();
        if (json.data) {
          const c = json.data;
          setExistingConsultation(c);
          setChiefComplaint(c.chiefComplaint || "");
          setHpi(c.historyOfPresentIllness || "");
          setFindings(c.examinationFindings || "");
          setDiagnosis(c.diagnosis || "");
          setAdvice(c.adviceInstructions || "");
          if (c.followUpDate) {
            try {
              const fd = new Date(c.followUpDate);
              if (!isNaN(fd.getTime())) {
                setFollowUpDate(fd.toISOString().split("T")[0]);
              }
            } catch (e) {
              console.error("Invalid followUpDate:", e);
            }
          }
          if (c.vitals) {
            setBpSys(c.vitals.bloodPressureSys ? String(c.vitals.bloodPressureSys) : "");
            setBpDia(c.vitals.bloodPressureDia ? String(c.vitals.bloodPressureDia) : "");
            setPulse(c.vitals.pulseRateBpm ? String(c.vitals.pulseRateBpm) : "");
            setTemp(c.vitals.temperatureF ? String(c.vitals.temperatureF) : "");
            setSpo2(c.vitals.spo2Percent ? String(c.vitals.spo2Percent) : "");
            setWeight(c.vitals.weightKg ? String(c.vitals.weightKg) : "");
            setHeight(c.vitals.heightCm ? String(c.vitals.heightCm) : "");
          }
          if (c.prescriptions && c.prescriptions.length > 0 && c.prescriptions[0].items?.length > 0) {
            setMedicines(
              c.prescriptions[0].items.map((i: any) => ({
                medicineName: i.medicineName,
                strength: i.strength || "",
                frequency: i.frequency,
                duration: i.duration,
                dosage: i.dosage,
                instructions: i.instructions || ""
              }))
            );
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadConsultation();
  }, [visit?.id, currentUserRole, currentUserId]);

  // Add Medicine Row
  const handleAddMedicine = () => {
    setMedicines([
      ...medicines,
      {
        medicineName: "",
        strength: "",
        frequency: "१-०-१ (सकाळ - संध्याकाळ जेवणानंतर)",
        duration: "५ दिवस"
      }
    ]);
  };

  // Pre-fill from Most Used Medicine (No tab prefix, sets clean fields)
  const handleSelectCommonMedicine = (index: number, med: typeof COMMON_MEDICINES[0]) => {
    const updated = [...medicines];
    updated[index] = {
      medicineName: med.name,
      strength: med.strength || "",
      frequency: med.frequency,
      duration: "५ दिवस"
    };
    setMedicines(updated);
  };

  // Remove Medicine Row
  const handleRemoveMedicine = (index: number) => {
    if (medicines.length === 1) {
      setMedicines([
        {
          medicineName: "",
          strength: "",
          frequency: "१-०-१ (सकाळ - संध्याकाळ जेवणानंतर)",
          duration: "५ दिवस"
        }
      ]);
      return;
    }
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  // Update Medicine Row
  const handleUpdateMedicine = (index: number, field: keyof MedicineRow, value: string) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  // Finalize Consultation Submit
  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    setErrorMsg(null);

    const validMedicines = medicines
      .filter((m) => m.medicineName.trim().length > 0)
      .map((m) => ({
        medicineName: m.medicineName.trim(),
        strength: m.strength?.trim() || null,
        dosage: "1",
        frequency: m.frequency.trim(),
        duration: m.duration.trim() || "५ दिवस",
        instructions: null
      }));

    // Make clinical notes optional without blocking doctor:
    // If empty, gracefully supply safe clinical defaults
    const finalChiefComplaint = chiefComplaint.trim() || "General Consultation";
    const finalDiagnosis = diagnosis.trim() || "Clinical Evaluation";

    const payload = {
      opdVisitId: visit.id,
      patientId: visit.patientId,
      doctorId: visit.doctorId,
      chiefComplaint: finalChiefComplaint,
      historyOfPresentIllness: hpi.trim() || null,
      examinationFindings: findings.trim() || null,
      diagnosis: finalDiagnosis,
      adviceInstructions: advice.trim() || null,
      followUpDate: followUpDate || null,
      userRole: currentUserRole || "DOCTOR",
      userId: currentUserId || visit.doctorId || "",
      vitals: {
        bloodPressureSys: bpSys ? parseInt(bpSys, 10) : null,
        bloodPressureDia: bpDia ? parseInt(bpDia, 10) : null,
        pulseRateBpm: pulse ? parseInt(pulse, 10) : null,
        temperatureF: temp ? parseFloat(temp) : null,
        spo2Percent: spo2 ? parseInt(spo2, 10) : null,
        weightKg: weight ? parseFloat(weight) : null,
        heightCm: height ? parseFloat(height) : null
      },
      medicines: validMedicines
    };

    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": currentUserRole || "DOCTOR",
          "x-user-id": currentUserId || visit.doctorId || ""
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to finalize consultation");

      onRefresh();

      // Automatically trigger printable prescription preview
      if (json.data?.prescription) {
        onPrintPrescription({
          doctorName: visit.doctor.doctorName,
          doctorSpecialty: visit.doctor.specialty,
          doctorReg: visit.doctor.registrationNumber,
          patient: visit.patient,
          consultation: json.data.consultation,
          prescriptionNumber: json.data.prescription.prescriptionNumber,
          medicines: validMedicines
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5 sm:space-y-6">
      {/* Datalist for Medicine Autocomplete */}
      <datalist id="common-medicines-list">
        {COMMON_MEDICINES.map((m, idx) => (
          <option key={idx} value={m.name}>
            {m.strength ? `${m.strength} - ${m.frequency}` : m.frequency}
          </option>
        ))}
      </datalist>

      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            type="button"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to OPD Queue</span>
          </button>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E6F7F4] border border-[#70CFBA]/50 text-[#1d6f63] rounded-full text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#258B7C] animate-pulse"></span>
            <span>Doctor Window</span>
          </span>
        </div>

        {existingConsultation && (
          <button
            onClick={() =>
              onPrintPrescription({
                doctorName: visit.doctor.doctorName,
                doctorSpecialty: visit.doctor.specialty,
                doctorReg: visit.doctor.registrationNumber,
                patient: visit.patient,
                consultation: existingConsultation,
                prescriptionNumber: existingConsultation.prescriptions?.[0]?.prescriptionNumber || "RX-FINAL",
                medicines: existingConsultation.prescriptions?.[0]?.items || medicines
              })
            }
            type="button"
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-[#258B7C] border border-[#258B7C] px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Current Prescription</span>
          </button>
        )}
      </div>

      {/* Patient Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#E6F7F4] text-[#258B7C] flex items-center justify-center font-bold text-xl flex-shrink-0">
            {visit.patient.fullName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{visit.patient.fullName}</h2>
              <span className="bg-[#E6F7F4] text-[#258B7C] text-[11px] font-bold px-2 py-0.2 rounded-full">
                {visit.patient.patientId}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {visit.patient.age} Yrs / {visit.patient.gender} • Mobile: {visit.patient.mobileNumber}
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 text-xs">
          <p className="font-bold text-slate-800">{visit.doctor.doctorName}</p>
          <p className="text-slate-500 text-[11px]">
            Token #{visit.tokenNumber} • Visit #{visit.visitNumber}
          </p>
          <p className="text-slate-400 text-[10px]">{visit.visitTime}</p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Consultation Form */}
      <form onSubmit={handleFinalize} className="space-y-6">
        {/* Section A: Vitals */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Activity className="w-4 h-4 text-[#258B7C]" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Vitals
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">BP Sys (mmHg)</label>
              <input
                type="number"
                value={bpSys}
                onChange={(e) => setBpSys(e.target.value)}
                placeholder="120"
                className="w-full p-2 border border-slate-200 rounded-xl text-center focus:outline-none focus:border-[#258B7C]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">BP Dia (mmHg)</label>
              <input
                type="number"
                value={bpDia}
                onChange={(e) => setBpDia(e.target.value)}
                placeholder="80"
                className="w-full p-2 border border-slate-200 rounded-xl text-center focus:outline-none focus:border-[#258B7C]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Pulse (bpm)</label>
              <input
                type="number"
                value={pulse}
                onChange={(e) => setPulse(e.target.value)}
                placeholder="72"
                className="w-full p-2 border border-slate-200 rounded-xl text-center focus:outline-none focus:border-[#258B7C]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Temp (°F)</label>
              <input
                type="number"
                step="0.1"
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
                placeholder="98.6"
                className="w-full p-2 border border-slate-200 rounded-xl text-center focus:outline-none focus:border-[#258B7C]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">SpO2 (%)</label>
              <input
                type="number"
                value={spo2}
                onChange={(e) => setSpo2(e.target.value)}
                placeholder="99"
                className="w-full p-2 border border-slate-200 rounded-xl text-center focus:outline-none focus:border-[#258B7C]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Weight (kg)</label>
              <input
                type="number"
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="65"
                className="w-full p-2 border border-slate-200 rounded-xl text-center focus:outline-none focus:border-[#258B7C]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Height (cm)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="165"
                className="w-full p-2 border border-slate-200 rounded-xl text-center focus:outline-none focus:border-[#258B7C]"
              />
            </div>
          </div>
        </div>

        {/* Section B: Clinical Notes (Optional, no asterisks, no explicit "optional" written) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Stethoscope className="w-4 h-4 text-[#258B7C]" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">Clinical Notes</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Chief Complaint */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Chief Complaint
              </label>
              <textarea
                rows={2}
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="e.g. Fever since 3 days, body ache, dry cough"
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
              />
            </div>

            {/* History of Present Illness */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">History of Present Illness</label>
              <textarea
                rows={2}
                value={hpi}
                onChange={(e) => setHpi(e.target.value)}
                placeholder="Onset, progression, aggravating or relieving factors"
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
              />
            </div>

            {/* Examination Findings */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Examination / Findings</label>
              <textarea
                rows={2}
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                placeholder="e.g. Throat congested, chest clear bilaterally, abdomen soft"
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
              />
            </div>

            {/* Diagnosis */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Diagnosis
              </label>
              <textarea
                rows={2}
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g. Acute Viral Upper Respiratory Tract Infection"
                className="w-full p-2.5 rounded-xl border border-[#70CFBA] bg-[#E6F7F4]/30 focus:outline-none focus:border-[#258B7C] font-semibold"
              />
            </div>
          </div>

          {/* Advice & Follow-up */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Advice / Instructions</label>
              <input
                type="text"
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                placeholder="e.g. Drink plenty of warm fluids, steam inhalation twice daily"
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Follow-up Date</label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#258B7C]"
              />
            </div>
          </div>
        </div>

        {/* Section C: Prescription (Add/Remove Medicines with Marathi Frequencies) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#258B7C]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Prescription (℞) Medicines &amp; Marathi Timing
              </h3>
            </div>
            <button
              onClick={handleAddMedicine}
              type="button"
              className="flex items-center gap-1 text-xs font-semibold text-[#258B7C] hover:underline self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Medicine Row</span>
            </button>
          </div>

          {/* Medicine Rows */}
          <div className="space-y-3">
            {medicines.map((med, index) => (
              <div
                key={index}
                className="p-3.5 bg-[#F7F9FA] rounded-xl border border-slate-200/80 text-xs shadow-2xs"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3 items-end">
                  {/* Medicine Name with Dropdown beside it */}
                  <div className="md:col-span-5 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700">
                        औषधाचे नाव (Medicine Name)
                      </label>
                      <select
                        onChange={(e) => {
                          const match = COMMON_MEDICINES.find((m) => m.name === e.target.value);
                          if (match) handleSelectCommonMedicine(index, match);
                        }}
                        className="text-[10px] bg-[#E6F7F4] text-[#1C6B5F] font-semibold rounded px-2 py-0.5 border border-[#70CFBA]/50 cursor-pointer max-w-[210px] truncate"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          औषध निवडा (Choose Medicine)...
                        </option>
                        {COMMON_MEDICINES.map((m, mIdx) => (
                          <option key={mIdx} value={m.name}>
                            {m.name} {m.strength && `(${m.strength})`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="text"
                      list="common-medicines-list"
                      value={med.medicineName}
                      onChange={(e) => {
                        const val = e.target.value;
                        const match = COMMON_MEDICINES.find(
                          (m) => m.name.toLowerCase() === val.toLowerCase()
                        );
                        if (match) {
                          handleSelectCommonMedicine(index, match);
                        } else {
                          handleUpdateMedicine(index, "medicineName", val);
                        }
                      }}
                      placeholder="उदा. Paracetamol / Pan-D / Dolo"
                      className="w-full p-2 bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-[#258B7C] font-bold text-slate-900"
                    />
                  </div>

                  {/* Strength */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Strength
                    </label>
                    <input
                      type="text"
                      value={med.strength}
                      onChange={(e) => handleUpdateMedicine(index, "strength", e.target.value)}
                      placeholder="उदा. 650mg"
                      className="w-full p-2 bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-[#258B7C]"
                    />
                  </div>

                  {/* Marathi Frequency */}
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[11px] font-bold text-[#258B7C] block truncate">
                      वेळ व प्रमाण (Marathi Frequency)
                    </label>
                    <select
                      value={med.frequency}
                      onChange={(e) => handleUpdateMedicine(index, "frequency", e.target.value)}
                      className="w-full p-2 bg-white text-[#1C6B5F] font-semibold rounded-lg border border-[#70CFBA]/50 focus:outline-none truncate"
                    >
                      {MARATHI_FREQUENCIES.map((freq, fIdx) => (
                        <option key={fIdx} value={freq}>
                          {freq}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Duration */}
                  <div className="md:col-span-1 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block truncate">
                      कालावधी
                    </label>
                    <input
                      type="text"
                      value={med.duration}
                      onChange={(e) => handleUpdateMedicine(index, "duration", e.target.value)}
                      placeholder="५ दिवस"
                      className="w-full p-2 bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-[#258B7C]"
                    />
                  </div>

                  {/* Delete Button */}
                  <div className="md:col-span-1 flex justify-center pb-1">
                    <button
                      onClick={() => handleRemoveMedicine(index)}
                      type="button"
                      title="Remove medicine"
                      className="p-2 text-slate-400 hover:text-rose-600 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onBack}
            type="button"
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Cancel / Back
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#258B7C] hover:bg-[#1C6B5F] text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? "Signing & Finalizing..." : "Finalize & Sign Prescription"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
