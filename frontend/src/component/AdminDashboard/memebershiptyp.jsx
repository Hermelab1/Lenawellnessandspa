import React from "react";
import LookupManager from "./UI/Lookupmanager";
import { membershipTypeApi } from "../Api/apilist"; // adjust path to where your api file lives

// Set to false while the MembershipType model/table has no Price/DurationDays columns.
const PRICING_ENABLED = true;

const MembershipType = () => (
  <LookupManager
    title="Membership types"
    singular="Membership type"
    subtitle="The plans members can sign up for."
    api={membershipTypeApi}
    withPricing={PRICING_ENABLED}
  />
);

export default MembershipType;