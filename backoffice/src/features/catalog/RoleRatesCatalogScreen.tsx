import React from "react";

export default function RoleRatesCatalogScreen() {
  return (
    <div className="page">
      <div className="row">
        <h1 className="h1">Role Rates</h1>
      </div>

      <div className="card mt18">
        <div className="cardBody">
          <div style={{ fontWeight: 900 }}>Role → default rate</div>
          <div className="muted mt6">
            Next: QuickCrew can define roles (e.g., Bartender, Cleaner) and a default rate that employers can optionally use in shift creation.
          </div>
        </div>
      </div>
    </div>
  );
}