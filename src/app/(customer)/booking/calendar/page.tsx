
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type BookingDate = {
  value: string;
  weekday: string;
  day: string;
  month: string;
  isOperatingDay: boolean;
};

type AvailableSlot = {
  startTime: string;
  endTime: string;
  label: string;
};

type AvailabilityDate = {
  date: string;
  weekday: string;
  isOperatingDay: boolean;
  slots: AvailableSlot[];
};

type AvailabilityResponse = {
  success: boolean;
  message?: string;
  societyId: string;
  societyName: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  timezone: string;
  bookingHorizonDays: number;
  dates: AvailabilityDate[];
};

type VehicleType = "Hatchback" | "Sedan" | "SUV";

type Service = {
  id: string;
  name: string;
  description: string;
  price: number;
  featured: boolean;
  duration_minutes: number | null;
};

export default function BookingCalendarPage() {
  const router = useRouter();

  const [dates, setDates] = useState<BookingDate[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [vehicle, setVehicle] = useState<VehicleType>("Hatchback");

  const [serviceId, setServiceId] = useState("");
  const [societyId, setSocietyId] = useState("");
  const [societyName, setSocietyName] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [service, setService] = useState<Service | null>(null);
  const [isLoadingService, setIsLoadingService] = useState(true);
  const [serviceError, setServiceError] = useState("");
  const [availabilityDates, setAvailabilityDates] = useState<
    AvailabilityDate[]
  >([]);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadBookingDetails() {
      const params = new URLSearchParams(window.location.search);
      const requestedServiceId = params.get("service") ?? "";

      const savedSocietyId = sessionStorage.getItem(
        "nestos-selected-society"
      );

      if (!requestedServiceId || !savedSocietyId) {
        router.replace(savedSocietyId ? "/services" : "/societies");
        return;
      }

      try {
        setIsLoadingService(true);
        setServiceError("");

        const [societiesResponse, servicesResponse] = await Promise.all([
          fetch("/api/societies", { cache: "no-store" }),
          fetch(
            `/api/services?societyId=${encodeURIComponent(savedSocietyId)}`,
            { cache: "no-store" }
          ),
        ]);

        const societiesData = await societiesResponse.json();
        const servicesData = await servicesResponse.json();

        if (!societiesResponse.ok || !societiesData.success) {
          throw new Error("Unable to verify the selected society.");
        }

        if (!servicesResponse.ok || !servicesData.success) {
          throw new Error("Unable to load services for this society.");
        }

        const selectedSociety = societiesData.societies.find(
          (item: { id: string; name: string }) =>
            item.id === savedSocietyId
        );

        const selectedService = servicesData.services.find(
          (item: Service) => item.id === requestedServiceId
        );

        if (!selectedSociety || !selectedService) {
          router.replace(selectedSociety ? "/services" : "/societies");
          return;
        }

        const availabilityResponse = await fetch(
          `/api/availability?societyId=${encodeURIComponent(
            selectedSociety.id
          )}&serviceId=${encodeURIComponent(selectedService.id)}`,
          { cache: "no-store" }
        );

        const availabilityData: AvailabilityResponse =
          await availabilityResponse.json();

        if (!availabilityResponse.ok || !availabilityData.success) {
          throw new Error(
            availabilityData.message || "Unable to load live availability."
          );
        }

        if (!cancelled) {
          setAvailabilityDates(availabilityData.dates);
          setDurationMinutes(availabilityData.durationMinutes);

          const calendarDates: BookingDate[] =
            availabilityData.dates.map((item) => {
              const date = new Date(`${item.date}T12:00:00`);

              return {
                value: item.date,
                weekday: item.weekday,
                day: date.toLocaleDateString("en-IN", {
                  day: "2-digit",
                }),
                month: date.toLocaleDateString("en-IN", {
                  month: "short",
                }),
                isOperatingDay: item.isOperatingDay,
              };
            });

          setDates(calendarDates);

          const firstAvailableDate = availabilityData.dates.find(
            (item) => item.isOperatingDay && item.slots.length > 0
          );

          const firstOperatingDate = availabilityData.dates.find(
            (item) => item.isOperatingDay
          );

          setSelectedDate(
            firstAvailableDate?.date ?? firstOperatingDate?.date ?? ""
          );
        }

        if (!cancelled) {
          setService(selectedService);
          setServiceId(selectedService.id);
          setSocietyId(selectedSociety.id);
          setSocietyName(selectedSociety.name);


          setIsReady(true);
        }
      } catch (error) {
        console.error("Failed to load booking details:", error);

        if (!cancelled) {
          setServiceError(
            "Unable to load booking details. Please refresh the page."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingService(false);
          setIsLoadingAvailability(false);
        }
      }
    }

    loadBookingDetails();

    return () => {
      cancelled = true;
    };
  }, [router]);



  const vehicleSurcharge = vehicle === "SUV" ? 100 : 0;
  const servicePrice = Number(service?.price ?? 0);
  const totalPrice = servicePrice + vehicleSurcharge;

  const slotsForSelectedDate =
    availabilityDates.find((date) => date.date === selectedDate)?.slots ?? [];

  function continueToReview() {
    if (!service || !selectedDate || !selectedSlot) {
      return;
    }

    const draft = {
      societyId,
      serviceId,
      date: selectedDate,
      time: selectedSlot,
      vehicle,
      basePrice: service.price,
      vehicleSurcharge,
      totalPrice,
    };

    sessionStorage.setItem(
      "nestos-booking-draft",
      JSON.stringify(draft)
    );

    router.push("/booking/review");
  }

  if (isLoadingService || !isReady) {
    return (
      <div className="container-shell flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted">
          Preparing your booking...
        </p>
      </div>
    );
  }

  if (serviceError || !service) {
    return (
      <div className="container-shell flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-red-600">
          {serviceError || "Unable to load the selected service."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <section className="bg-forest text-white">
        <div className="container-shell py-10 md:py-14">
          <Link
            href="/services"
            className="text-sm text-white/70 hover:text-lime"
          >
            ← Back to services
          </Link>

          <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-lime">
            Step 3 · Schedule your wash
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            When works for you?
          </h1>

          <p className="mt-3 text-sm text-white/75 sm:text-base">
            Choose your preferred date, time and vehicle.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
              {societyName}
            </span>
            <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
              {service.name}
            </span>
          </div>
        </div>
      </section>

      <section className="container-shell py-8 md:py-12">

        <div className="grid items-start gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-8">
            {/* Date selection */}
            <section className="rounded-3xl border border-border bg-white p-5 sm:p-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-forest">
                  01 · Choose a date
                </p>
                <h2 className="mt-2 text-xl font-bold text-ink">
                  Next 14 days
                </h2>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-7">
                {dates.map((date) => {
                  const isSelected = selectedDate === date.value;

                  return (
                    <button
                      key={date.value}
                      type="button"
                      disabled={!date.isOperatingDay}
                      onClick={() => {
                        setSelectedDate(date.value);
                        setSelectedSlot("");
                      }}
                      className={`flex min-h-[94px] flex-col items-center justify-center rounded-2xl border px-1 py-3 transition ${isSelected
                        ? "border-forest bg-forest text-white"
                        : date.isOperatingDay
                          ? "border-border bg-white text-ink hover:border-forest"
                          : "cursor-not-allowed border-border bg-gray-50 text-gray-400"
                        }`}
                    >
                      <span className="text-xs">
                        {date.weekday}
                      </span>
                      <span className="mt-1 text-2xl font-bold">
                        {date.day}
                      </span>
                      <span className="mt-1 text-xs">
                        {date.month}
                      </span>
                      {!date.isOperatingDay && (
                        <span className="mt-1 text-[9px]">
                          Closed
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Time selection */}
            <section className="rounded-3xl border border-border bg-white p-5 sm:p-7">
              <p className="text-xs font-bold uppercase tracking-wider text-forest">
                02 · Choose a time
              </p>
              <h2 className="mt-2 text-xl font-bold text-ink">
                Available time slots
              </h2>

              {!selectedDate ? (
                <p className="mt-5 text-sm text-muted">
                  Choose an operating day first.
                </p>
              ) : (
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {slotsForSelectedDate.length === 0 ? (
                    <p className="col-span-full text-sm text-muted">
                      No available slots for this date. Please choose another date.
                    </p>
                  ) : (
                    slotsForSelectedDate.map((slot) => (
                      <button
                        key={slot.startTime}
                        type="button"
                        onClick={() => setSelectedSlot(slot.startTime)}
                        className={`min-h-12 rounded-xl border px-3 py-3 text-sm font-semibold transition ${selectedSlot === slot.startTime
                          ? "border-forest bg-forest text-white"
                          : "border-border bg-white text-ink hover:border-forest"
                          }`}
                      >
                        {slot.label}
                      </button>
                    ))
                  )}
                </div>
              )}

              <p className="mt-4 text-xs leading-5 text-muted">
                {durationMinutes}-minute wash. Availability is based on the selected
                society's operating hours and current booking capacity.
              </p>
            </section>

            {/* Vehicle selection */}
            <section className="rounded-3xl border border-border bg-white p-5 sm:p-7">
              <p className="text-xs font-bold uppercase tracking-wider text-forest">
                03 · Select your vehicle
              </p>
              <h2 className="mt-2 text-xl font-bold text-ink">
                What do you drive?
              </h2>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(
                  [
                    { name: "Hatchback", detail: "No surcharge" },
                    { name: "Sedan", detail: "No surcharge" },
                    { name: "SUV", detail: "+₹100 surcharge" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setVehicle(item.name)}
                    className={`rounded-2xl border p-4 text-left transition ${vehicle === item.name
                      ? "border-forest bg-forest/5 ring-1 ring-forest"
                      : "border-border hover:border-forest"
                      }`}
                  >
                    <span className="block font-semibold text-ink">
                      {item.name}
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      {item.detail}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Booking summary */}
          <aside className="rounded-3xl border border-border bg-white p-6 lg:sticky lg:top-28">
            <p className="text-xs font-bold uppercase tracking-wider text-forest">
              Your selection
            </p>

            <h2 className="mt-2 text-xl font-bold text-ink">
              Booking summary
            </h2>

            <div className="mt-6 space-y-4 text-sm">
              <div>
                <p className="text-muted">Society</p>
                <p className="mt-1 font-semibold text-ink">
                  {societyName}
                </p>
              </div>

              <div>
                <p className="text-muted">Service</p>
                <p className="mt-1 font-semibold text-ink">
                  {service.name}
                </p>
              </div>

              <div>
                <p className="text-muted">Date</p>
                <p className="mt-1 font-semibold text-ink">
                  {selectedDate || "Select a date"}
                </p>
              </div>

              <div>
                <p className="text-muted">Time</p>
                <p className="mt-1 font-semibold text-ink">
                  {selectedSlot || "Select a time"}
                </p>
              </div>

              <div>
                <p className="text-muted">Vehicle</p>
                <p className="mt-1 font-semibold text-ink">
                  {vehicle}
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-border pt-5">
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-muted">Service price</span>
                <span className="font-medium text-ink">
                  ₹{service.price}
                </span>
              </div>

              <div className="mt-3 flex justify-between gap-3 text-sm">
                <span className="text-muted">Vehicle surcharge</span>
                <span className="font-medium text-ink">
                  ₹{vehicleSurcharge}
                </span>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                <span className="font-semibold text-ink">
                  Total
                </span>
                <span className="text-2xl font-bold text-forest">
                  ₹{totalPrice}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={continueToReview}
              disabled={!selectedDate || !selectedSlot}
              className="mt-6 flex min-h-12 w-full items-center justify-center rounded-full bg-forest px-5 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Continue to review →
            </button>

            <p className="mt-3 text-center text-xs leading-5 text-muted">
              Your booking is not confirmed yet.
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
}
