"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useSubscription } from "@/lib/useSubscription";
import { Lock } from "lucide-react";
import Link from "next/link";

interface BusinessProfile {
  business_name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  show_header?: boolean;
  include_signature?: boolean;
  signature_name?: string;
  enable_arabic?: boolean;
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked?: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    
      
    
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { plan } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const isFree = plan === "free";
  const isBusiness = plan === "business";

  const [profile, setProfile] = useState({
    business_name: "",
    address1: "",
    address2: "",
    city: "",
    country: "",
    phone: "",
    email: "",
    website: "",
    show_header: false,
    include_signature: false,
    signature_name: "",
    enable_arabic: false,
  });

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (data) setProfile(data);
      setLoading(false);
    };
    load();
  }, [router]);

  const set = (field: keyof BusinessProfile, value: string | boolean) =>
    setProfile((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFree) return;
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const { error: err } = await supabase
      .from("business_profiles")
      .upsert({ user_id: user.id, ...profile }, { onConflict: "user_id" });
    setSaving(false);
    if (err) {
      setError("Failed to save. Please try again.");
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      router.push("/");
    }, 2000);
  };

  const inputClass = (disabled?: boolean) =>
    `h-11 w-full rounded-2xl border px-4 text-sm shadow-sm outline-none transition ${
      disabled
        ? "border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed"
        : "border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
    }`;

  if (loading) {
    return (
      

        

          

          

Loading profile...


        

      

    );
  }

  return (
    

      

        

          

            

              
                
              
              

                

                  Business Profile
                

                


                  Manage your business information for invoices.
                


              

            

          


          

            {isFree && (
              

                


                  Business Profile is a Pro feature. Upgrade to
                  Pro to save your logo, business details and signature.
                


                
                  Upgrade to Pro
                
              

            )}

            

              

                
                  Business Name
                
                 set("business_name", e.target.value)}
                  disabled={isFree}
                  className={inputClass(isFree)}
                  placeholder="Your Business Name"
                />
              

              

                
                  Phone
                
                 set("phone", e.target.value)}
                  disabled={isFree}
                  className={inputClass(isFree)}
                  placeholder="+1 234 567 8900"
                />
              

            


            

              

                
                  Email
                
                 set("email", e.target.value)}
                  disabled={isFree}
                  className={inputClass(isFree)}
                  placeholder="business@example.com"
                />
              

              

                
                  Website
                
                 set("website", e.target.value)}
                  disabled={isFree}
                  className={inputClass(isFree)}
                  placeholder="https://example.com"
                />
              

            


            

              
                Address Line 1
              
               set("address1", e.target.value)}
                disabled={isFree}
                className={inputClass(isFree)}
                placeholder="Street address"
              />
            


            

              
                Address Line 2
              
               set("address2", e.target.value)}
                disabled={isFree}
                className={inputClass(isFree)}
                placeholder="Apartment, suite, etc."
              />
            


            

              

                
                  City
                
                 set("city", e.target.value)}
                  disabled={isFree}
                  className={inputClass(isFree)}
                  placeholder="City"
                />
              

              

                
                  Country
                
                 set("country", e.target.value)}
                  disabled={isFree}
                  className={inputClass(isFree)}
                  placeholder="Country"
                />
              

            


            

              
                Logo URL
              
               set("logo_url", e.target.value)}
                disabled={isFree}
                className={inputClass(isFree)}
                placeholder="https://example.com/logo.png"
              />
            


            

              

                Invoice Options
              

              

                

                  


                    Show Business Header in PDF
                  


                  


                    Add your business name and details at the top of invoices
                  


                

                 set("show_header", !profile.show_header)}
                  disabled={isFree}
                />
              

              

                

                  


                    Include Digital Signature
                  


                  


                    Add a signature line at the bottom of invoices
                  


                

                
                    set("include_signature", !profile.include_signature)
                  }
                  disabled={isFree}
                />
              

              {!isFree && profile.include_signature && (
                

                  
                    Signature Name
                  
                   set("signature_name", e.target.value)}
                    className={inputClass()}
                    placeholder="Your full name"
                  />
                

              )}
            


            

              

                

                  Arabic Support
                

                {!isBusiness && (
                  
                )}
              

              

                

                  


                    Enable Arabic PDF Support
                  


                  


                    Render Arabic text correctly with right-to-left support
                  


                  {!isBusiness && (
                    


                      Available on{" "}
                      
                        Business plan
                      
                    


                  )}
                

                
                    set("enable_arabic", !profile.enable_arabic)
                  }
                  disabled={!isBusiness}
                />
              

            


            {error && (
              

                {error}
              

            )}

            {success && (
              

                Profile saved! Redirecting...
              

            )}

            
              {saving
                ? "Saving..."
                : isFree
                ? "Upgrade to Pro to Save"
                : "Save Profile"}
            
          

        

      

    

  );
}