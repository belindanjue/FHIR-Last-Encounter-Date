/*
 Simple FHIR Patient CRUD + last encounter DATE display
*/

const client = FHIR.client("https://r3.smarthealthit.org");

//// CREATE
function addPatient() {
  const firstname = prompt("First name?");
  const lastname = prompt("Last name?");
  if (!firstname || !lastname) return;

  const patient = {
    resourceType: "Patient",
    name: [{
      given: [firstname],
      family: lastname
    }]
  };

  client.create(patient).then(addPatientRow);
}

//// BUILD TABLE ROW
function addPatientRow(patient) {
  const patientResults = document.querySelector("#patientResults");
  const tr = document.createElement("tr");

  // ID
  let td = document.createElement("td");
  td.textContent = patient.id;
  tr.appendChild(td);

  // First name
  td = document.createElement("td");
  td.textContent = patient.name?.[0]?.given?.[0] || "";
  tr.appendChild(td);

  // Last name
  td = document.createElement("td");
  td.textContent = patient.name?.[0]?.family || "";
  tr.appendChild(td);

  // Actions
  td = document.createElement("td");

  const btnDel = document.createElement("button");
  btnDel.textContent = "[X]";
  btnDel.onclick = deletePatient.bind({ patient_id: patient.id, row: tr });
  td.appendChild(btnDel);

  const btnEdit = document.createElement("button");
  btnEdit.textContent = "[Edit]";
  btnEdit.onclick = updatePatient.bind({ patient: patient, row: tr });
  td.appendChild(btnEdit);

  tr.appendChild(td);

  // Last Encounter Date column
  const tdEnc = document.createElement("td");
  tdEnc.textContent = "Loading...";
  tr.appendChild(tdEnc);

  // Append row first
  patientResults.appendChild(tr);

  // Then fetch last encounter date
  pullLastEncounterDate(patient.id, tdEnc);
}

//// READ
function showPatients() {
  const n = prompt("Name to search:");
  if (!n) return;

  client.request("Patient?name=" + encodeURIComponent(n))
    .then(handlePatients)
    .catch(console.error);
}

function handlePatients(data) {
  const patientResults = document.querySelector("#patientResults");
  patientResults.innerHTML = "";

  if (!data.entry) return;

  data.entry.forEach(e => addPatientRow(e.resource));
}

//// PULL LATEST ENCOUNTER DATE
function pullLastEncounterDate(patientId, tdElement) {
  client.request("Encounter?subject=Patient/" + patientId + "&_sort=-date&_count=1")
    .then(function (res) {
      if (!res.entry || res.entry.length === 0) {
        tdElement.innerHTML = "<i>No encounters</i>";
        return;
      }

      const enc = res.entry[0].resource;

      // Try period.start, then period.end, then meta.lastUpdated as fallback
      let dateStr =
        (enc.period && enc.period.start) ||
        (enc.period && enc.period.end) ||
        enc.meta?.lastUpdated ||
        null;

      if (!dateStr) {
        tdElement.innerHTML = "<i>No date</i>";
        return;
      }

      // Show just YYYY-MM-DD
      const displayDate = dateStr.substring(0, 10);
      tdElement.textContent = displayDate;
    })
    .catch(function (err) {
      console.error(err);
      tdElement.innerHTML = "<i>Error</i>";
    });
}

//// UPDATE
function updatePatient() {
  const firstname = prompt("First name?", this.patient.name?.[0]?.given?.[0] || "");
  if (!firstname) return;

  const lastname = prompt("Last name?", this.patient.name?.[0]?.family || "");
  if (!lastname) return;

  client.patch("Patient/" + this.patient.id, [
    { op: "replace", path: "/name/0/given/0", value: firstname },
    { op: "replace", path: "/name/0/family", value: lastname }
  ]).then(updated => {
    addPatientRow(updated);
    this.row.remove();
  });
}

//// DELETE
function deletePatient() {
  if (!confirm("Are you sure you want to delete this patient?")) return;

  client.delete("Patient/" + this.patient_id);
  this.row.remove();
}

// Make sure HTML onclick can find these (extra safety)
window.showPatients = showPatients;
window.addPatient = addPatient;
