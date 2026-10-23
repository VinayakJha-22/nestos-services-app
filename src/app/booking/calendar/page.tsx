
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { services } from "@/config/services";
import { societies } from "@/config/societies";
import { bookingPreview } from "@/config/booking-preview";

type BookingDate = {
  value: string;
  weekday: string;
  day: string;
  month: string;
  isOperatingDay: boolean;
};

type VehicleType = "Hatchback" | "Sedan" | "SUV";

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createBookingDates(): BookingDate[] {
  const today = new Date();

  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);

    return {
      value: getLocalDateString(date),
      weekday: date.toLocaleDateString("en-IN", {
        weekday: "short",
      }),
      day: date.toLocaleDateString("en-IN", {
        day: "2-digit",
      }),
      month: date.toLocaleDateString("en-IN", {
        month: "short",
      }),
      isOperatingDay: bookingPreview.operatingDays.includes(
        date.getDay()
      ),
    };
  });
}

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedServiceId = params.get("service") ?? "";

    const selectedService = services.find(
      (service) => service.id === requestedServiceId
    );

    const savedSocietyId = sessionStorage.getItem(
      "nestos-selected-society"
    );

    const selectedSociety = societies.find(
      (society) =>
        society.id === savedSocietyId &&
        society.status === "accepting"
    );

    if (!selectedService || !selectedSociety) {
      router.replace(
        selectedSociety ? "/services" : "/societies"
      );
      return;
    }

    const availableDates = createBookingDates();

    setServiceId(selectedService.id);
    setSocietyId(selectedSociety.id);
    setSocietyName(selectedSociety.name);
    setDates(availableDates);

    const firstOperatingDay = availableDates.find(
      (date) => date.isOperatingDay
    );

    if (firstOperatingDay) {
      setSelectedDate(firstOperatingDay.value);
    }

    setIsReady(true);
  }, [router]);

  const service = services.find(
    (item) => item.id === serviceId
  );

  const vehicleSurcharge = vehicle === "SUV" ? 100 : 0;
  const totalPrice = (service?.price ?? 0) + vehicleSurcharge;

  // DEMO ONLY: simulated slot availability.
  // This must be replaced with live backend availability.
  const slotsForSelectedDate = bookingPreview.timeSlots.map(
    (time, index) => {
      const dateIndex = dates.findIndex(
        (date) => date.value === selectedDate
      );

      const isPreviewUnavailable =
        (index + dateIndex) % 5 === 4;

      return {
        time,
        available: !isPreviewUnavailable,
      };
    }
  );

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

  if (!isReady || !service) {
    return (
      <div className="container-shell flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted">
          Preparing your booking...
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
        <div className="mb-8 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <strong>Preview mode:</strong> dates, operating days and
          time-slot availability below are illustrative. No slot is
          reserved by this page. Live availability will be verified
          before a booking is confirmed.
        </div>

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
                      className={`flex min-h-[94px] flex-col items-center justify-center rounded-2xl border px-1 py-3 transition ${
                        isSelected
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
                  {slotsForSelectedDate.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot.time)}
                      className={`min-h-12 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                        selectedSlot === slot.time
                          ? "border-forest bg-forest text-white"
                          : slot.available
                            ? "border-border bg-white text-ink hover:border-forest"
                            : "cursor-not-allowed border-border bg-gray-50 text-gray-400 line-through"
                      }`}
                    >
                      {slot.time}
                      {!slot.available && (
                        <span className="mt-1 block text-[10px] font-normal no-underline">
                          Demo unavailable
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <p className="mt-4 text-xs leading-5 text-muted">
                Actual times and capacity will come from the selected
                society's live schedule.
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
                    className={`rounded-2xl border p-4 text-left transition ${
                      vehicle === item.name
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
