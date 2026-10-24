
export type Society = {
  id: string;
  name: string;
  address: string;
  locality: string;
  city: string;
  status: "accepting" | "coming-soon" | "unavailable";
};
