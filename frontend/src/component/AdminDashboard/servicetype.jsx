import React from "react";
import LookupManager from "./UI/Lookupmanager";
import { serviceTypeApi } from "../Api/apilist"; // adjust path to where your api file lives

const ServiceType = () => (
  <LookupManager
    title="Service types"
    singular="Service type"
    subtitle="The services a membership can include."
    api={serviceTypeApi}
  />
);

export default ServiceType;