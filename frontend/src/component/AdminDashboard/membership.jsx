import React from "react";
import LookupManager from "./UI/Lookupmanager";
import { membershipApi } from "../Api/apilist";

const Membership = () => (
  <LookupManager
    title="Members"
    singular="Member"
    subtitle="Manage members and their latest membership."
    api={membershipApi}
  />
);

export default Membership;