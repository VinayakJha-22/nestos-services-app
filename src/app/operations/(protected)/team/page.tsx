
"use client";

import { useCallback, useEffect, useState } from "react";

type Society = {
  id: string;
  name: string;
  address_line: string | null;
  locality: string | null;
  city: string | null;
  state: string | null;
  is_accepting_bookings: boolean;
};

type AssignedSociety = {
  id: string;
  name: string;
};

type TeamMember = {
  id: string;
  user_reference: string;
  full_name: string;
  phone_number: string;
  email: string | null;
  role: "central_admin" | "location_manager";
  account_status: string;
  phone_verified_at: string | null;
  created_at: string;
  assigned_societies: AssignedSociety[];
};

type TeamResponse = {
  users: TeamMember[];
  societies: Society[];
};

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#174C3D]";

const buttonClass =
  "rounded-xl bg-[#174C3D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#103B2F] disabled:cursor-not-allowed disabled:opacity-50";

export default function OperationsTeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<
    "central_admin" | "location_manager"
  >("location_manager");
  const [selectedSocietyIds, setSelectedSocietyIds] = useState<string[]>([]);

  const loadTeam = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError("");

      const response = await fetch("/api/operations/team", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load team information.");
      }

      const result = data as TeamResponse;
      setTeam(result.users);
      setSocieties(result.societies);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load team information."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  function resetForm() {
    setFullName("");
    setPhoneNumber("");
    setEmail("");
    setRole("location_manager");
    setSelectedSocietyIds([]);
    setFormError("");
  }

  function toggleSociety(societyId: string) {
    setSelectedSocietyIds((current) =>
      current.includes(societyId)
        ? current.filter((id) => id !== societyId)
        : [...current, societyId]
    );
  }

  async function handleCreateTeamMember(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (role === "location_manager" && selectedSocietyIds.length === 0) {
      setFormError("Select at least one society for this Location Manager.");
      return;
    }

    if (role === "central_admin" && selectedSocietyIds.length > 0) {
      setFormError("Central Admin access does not require society assignments.");
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch("/api/operations/team/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          phoneNumber,
          email,
          role,
          societyIds: selectedSocietyIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const occupied = Array.isArray(data.societies)
          ? ` Already assigned: ${data.societies.join(", ")}.`
          : "";

        throw new Error((data.error || "Unable to add team member.") + occupied);
      }

      setSuccessMessage("Team member added successfully.");
      resetForm();
      setShowForm(false);
      await loadTeam();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to add team member."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function formatPhone(phone: string) {
    const digits = phone.replace(/\D/g, "");
    return digits.startsWith("91") ? `+${digits}` : phone;
  }

  return (
    <div className="space-y-7">
      <section>
        <p className="text-sm font-semibold text-[#174C3D]">
          OPERATIONS / TEAM & ACCESS
        </p>

        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Team & Access
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Manage operations users and control access to your societies.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setSuccessMessage("");
              setFormError("");
              setShowForm((current) => !current);
            }}
            className={buttonClass}
          >
            {showForm ? "Close form" : "+ Add Team Member"}
          </button>
        </div>
      </section>

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800">
          {successMessage}
        </div>
      )}

      {showForm && (
        <section className="rounded-2xl border border-[#174C3D]/10 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold">Add Team Member</h2>
            <p className="mt-1 text-sm text-gray-500">
              The team member will use their mobile number to log in with OTP.
            </p>
          </div>

          <form onSubmit={handleCreateTeamMember} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="team-full-name"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Full name *
                </label>
                <input
                  id="team-full-name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className={inputClass}
                  placeholder="Enter full name"
                  maxLength={150}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="team-phone"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Mobile number *
                </label>
                <input
                  id="team-phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  className={inputClass}
                  placeholder="10-digit mobile number"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="team-email"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Email address
                </label>
                <input
                  id="team-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClass}
                  placeholder="Optional"
                />
              </div>

              <div>
                <label
                  htmlFor="team-role"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Role *
                </label>
                <select
                  id="team-role"
                  value={role}
                  onChange={(event) => {
                    const nextRole = event.target.value as
                      | "central_admin"
                      | "location_manager";

                    setRole(nextRole);
                    setSelectedSocietyIds([]);
                  }}
                  className={inputClass}
                >
                  <option value="location_manager">Location Manager</option>
                  <option value="central_admin">Central Admin</option>
                </select>
              </div>
            </div>

            {role === "central_admin" ? (
              <div className="rounded-xl border border-[#174C3D]/10 bg-[#F7F8F3] p-4">
                <p className="text-sm font-semibold text-[#174C3D]">
                  Global access
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Central Admins automatically have access to all societies.
                  No individual society assignment is needed.
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-3">
                  <h3 className="text-sm font-semibold">Assign societies *</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Select one or more societies this manager will operate.
                  </p>
                </div>

                {societies.length === 0 ? (
                  <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                    No societies are available.
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {societies.map((society) => {
                      const isSelected = selectedSocietyIds.includes(
                        society.id
                      );

                      return (
                        <label
                          key={society.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                            isSelected
                              ? "border-[#174C3D] bg-[#174C3D]/5"
                              : "border-gray-200 hover:border-[#174C3D]/40"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSociety(society.id)}
                            className="mt-1 size-4 accent-[#174C3D]"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold">
                              {society.name}
                            </span>
                            <span className="mt-1 block text-xs text-gray-500">
                              {[society.locality, society.city, society.state]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                            <span
                              className={`mt-2 inline-block text-xs font-medium ${
                                society.is_accepting_bookings
                                  ? "text-green-700"
                                  : "text-gray-500"
                              }`}
                            >
                              {society.is_accepting_bookings
                                ? "Accepting bookings"
                                : "Not accepting bookings"}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {formError && (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                disabled={isSaving}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className={buttonClass}
              >
                {isSaving ? "Adding member..." : "Add Team Member"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#174C3D]/10 bg-white p-5">
          <p className="text-sm text-gray-500">Total team members</p>
          <p className="mt-2 text-2xl font-bold">{team.length}</p>
        </div>

        <div className="rounded-2xl border border-[#174C3D]/10 bg-white p-5">
          <p className="text-sm text-gray-500">Central Admins</p>
          <p className="mt-2 text-2xl font-bold">
            {team.filter((member) => member.role === "central_admin").length}
          </p>
        </div>

        <div className="rounded-2xl border border-[#174C3D]/10 bg-white p-5">
          <p className="text-sm text-gray-500">Location Managers</p>
          <p className="mt-2 text-2xl font-bold">
            {team.filter((member) => member.role === "location_manager").length}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#174C3D]/10 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-5">
          <h2 className="text-lg font-bold">Team directory</h2>
          <p className="mt-1 text-sm text-gray-500">
            People who have access to the NestOS operations dashboard.
          </p>
        </div>

        {isLoading ? (
          <div className="px-5 py-14 text-center text-sm text-gray-500">
            Loading team members...
          </div>
        ) : loadError ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-red-600">{loadError}</p>
            <button
              type="button"
              onClick={loadTeam}
              className="mt-3 text-sm font-semibold text-[#174C3D] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : team.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="font-semibold">No team members found</p>
            <p className="mt-2 text-sm text-gray-500">
              Add your first operations team member to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-[#F7F8F3] text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Team member</th>
                  <th className="px-5 py-4 font-semibold">Role</th>
                  <th className="px-5 py-4 font-semibold">Society access</th>
                  <th className="px-5 py-4 font-semibold">Account status</th>
                  <th className="px-5 py-4 font-semibold">Phone verification</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {team.map((member) => (
                  <tr key={member.id} className="align-top">
                    <td className="px-5 py-4">
                      <p className="font-semibold">{member.full_name}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatPhone(member.phone_number)}
                      </p>
                      {member.email && (
                        <p className="mt-1 text-xs text-gray-500">
                          {member.email}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-[#174C3D]/10 px-3 py-1 text-xs font-semibold text-[#174C3D]">
                        {member.role === "central_admin"
                          ? "Central Admin"
                          : "Location Manager"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {member.role === "central_admin" ? (
                        <span className="font-medium text-[#174C3D]">
                          All societies
                        </span>
                      ) : member.assigned_societies.length > 0 ? (
                        <div className="space-y-1">
                          {member.assigned_societies.map((society) => (
                            <p key={society.id}>{society.name}</p>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">No societies</span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          member.account_status === "active"
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {member.account_status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {member.phone_verified_at ? (
                        <span className="font-medium text-green-700">
                          Verified
                        </span>
                      ) : (
                        <span className="font-medium text-amber-700">
                          Not verified
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-gray-500">
        Access is controlled by the Central Admin. Team members verify their
        mobile number when they first log in using OTP.
      </p>
    </div>
  );
}
