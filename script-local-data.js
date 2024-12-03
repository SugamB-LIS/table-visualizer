async function processQuery(userInput) {
  history.replaceState({}, "", "index.html");
  console.log(userInput);
  initialTableVisualizer("fetch-data.json");
}

// Fetch data from a local JSON file
async function fetchLocalData(jsonFile) {
  const response = await fetch(jsonFile);
  return await response.json();
}

// General table visualizer function
async function visualizeTable(jsonFile, userQuery) {
  const jsonData = await fetchLocalData(jsonFile);

  const {
    sql_query: sqlQuery,
    results: tableData,
    metadata_info: metadataInfo,
  } = jsonData;

  const userQueryInput = document.getElementById("user-query");
  const sqlQueryContainer = document.getElementById("sql-query-container");
  const tableContainer = document.getElementById("table-container");

  userQueryInput.value = userQuery;
  sqlQueryContainer.innerHTML = `<pre>${sqlQuery}</pre>`;

  // Create table with headers and clickable links
  let tableHtml = "<table><thead><tr>";
  tableData.schema.fields.forEach((col) => {
    const isClickable = checkIfColumnIsDrillable(col.name, metadataInfo);

    tableHtml += `<th>
      ${
        isClickable
          ? `<a href="#" class="clickable" onclick="handleColumnClick(event, '${userQuery}', '${encodeURIComponent(
              sqlQuery
            )}', '${col.name}')">${col.name}</a>`
          : col.name
      }
    </th>`;
  });

  tableHtml += "</tr></thead><tbody>";
  tableData.data.forEach((row) => {
    tableHtml +=
      "<tr>" +
      tableData.schema.fields
        .map((col) => `<td>${row[col.name]}</td>`)
        .join("") +
      "</tr>";
  });
  tableHtml += "</tbody></table>";

  tableContainer.innerHTML = tableHtml;
}

// Handle column click and show a popup
function handleColumnClick(event, userQuery, sqlQuery, columnName) {
  event.preventDefault(); // Prevent default link behavior
  console.log(`${columnName} clicked`);

  const metadataInfo = {
    merchandise: [
      { column_name: "department_id", is_drillable: true },
      { column_name: "department_description", is_drillable: true },
      { column_name: "profit" }, // No `is_drillable`, so only Drill Down is allowed
    ],
  }; // Mock metadata. Replace with actual data if necessary.

  // Check if the column is drillable
  const drillOptions = getDrillOptions(columnName, metadataInfo);

  // Create the popup
  // const popupDiv = document.createElement("div");
  // popupDiv.classList.add("popup");

  closeExistingPopup();

  // Create the popup
  const popupDiv = document.createElement("div");
  popupDiv.classList.add("popup");

  // Add close button
  const closeButton = document.createElement("button");
  closeButton.textContent = "X";
  closeButton.style.position = "absolute";
  closeButton.style.top = "5px";
  closeButton.style.right = "5px";
  closeButton.style.border = "none";
  closeButton.style.background = "transparent";
  closeButton.style.cursor = "pointer";
  closeButton.onclick = () => popupDiv.remove();
  popupDiv.appendChild(closeButton);
  // Add Drill Down button
  if (drillOptions.includes("Drill Down")) {
    const drillDownBtn = document.createElement("button");
    drillDownBtn.textContent = "Drill Down";
    drillDownBtn.onclick = async () => {
      console.log(`Drill Down on ${columnName}`);
      drilledTableVisualizer(userQuery, "drill_down.json"); // Replace with actual file
      popupDiv.remove();
    };
    popupDiv.appendChild(drillDownBtn);
  }

  // Add Drill Across button
  if (drillOptions.includes("Drill Across")) {
    const drillAcrossBtn = document.createElement("button");
    drillAcrossBtn.textContent = "Drill Across";
    drillAcrossBtn.onclick = async () => {
      console.log(`Drill Across on ${columnName}`);
      drilledTableVisualizer(userQuery, "drill_across.json"); // Replace with actual file
      popupDiv.remove();
    };
    popupDiv.appendChild(drillAcrossBtn);
  }

  // Style the popup
  popupDiv.style.position = "absolute";
  popupDiv.style.top = `${event.pageY}px`;
  popupDiv.style.left = `${event.pageX}px`;
  popupDiv.style.padding = "15px";
  popupDiv.style.backgroundColor = "#fff";
  popupDiv.style.border = "1px solid #ccc";
  popupDiv.style.boxShadow = "0px 4px 6px rgba(0,0,0,0.1)";
  popupDiv.style.zIndex = "1000";
  popupDiv.style.width = "175px";
  popupDiv.style.display = "flex";
  popupDiv.style.flexDirection = "column";
  popupDiv.style.alignItems = "flex-start";

  // Append popup to body
  document.body.appendChild(popupDiv);
}

// Determine drill options based on metadata
function getDrillOptions(columnName, metadataInfo) {
  for (const group of Object.values(metadataInfo)) {
    for (const column of group) {
      if (column.column_name === columnName) {
        if (column.is_drillable) {
          return ["Drill Down", "Drill Across"];
        }
        return ["Drill Down"]; // Default to Drill Down if not explicitly drillable
      }
    }
  }
  return []; // No options if column is not in metadata
}

// Visualize table after drilling
async function drilledTableVisualizer(userQuery, jsonFile) {
  await visualizeTable(jsonFile, userQuery);
}

// Check if a column is clickable (updated to match the requirement)
function checkIfColumnIsDrillable(columnName, metadataInfo) {
  return Object.values(metadataInfo).some((group) =>
    group.some((col) => col.column_name === columnName)
  );
}

// Initial table visualizer
async function initialTableVisualizer(jsonFile) {
  const jsonData = await fetchLocalData(jsonFile);
  visualizeTable(jsonFile, jsonData.user_query);
}

// Example of initializing with a query
processQuery("Show me total net sales by subclass for 2023");

// function handleColumnClick(
//   event,
//   userQuery,
//   columnName,
//   metadataInfo,
//   sqlQuery
// ) {
//   event.preventDefault();
//   const drillOptions = getDrillOptions(
//     columnName,
//     decodeURIComponent(metadataInfo)
//   );

//   // Close existing popup if it exists
//   closeExistingPopup();

//   // Create the popup
//   const popupDiv = document.createElement("div");
//   popupDiv.classList.add("popup");

//   // Add close button
//   const closeButton = document.createElement("button");
//   closeButton.textContent = "X";
//   closeButton.style.position = "absolute";
//   closeButton.style.top = "5px";
//   closeButton.style.right = "10px";
//   closeButton.style.border = "none";
//   closeButton.style.background = "transparent";
//   closeButton.style.cursor = "pointer";
//   closeButton.onclick = () => popupDiv.remove();
//   popupDiv.appendChild(closeButton);

//   // Drill Down button
//   if (drillOptions.includes("Drill Down")) {
//     const drillDownBtn = document.createElement("button");
//     drillDownBtn.textContent = "Drill Down";
//     drillDownBtn.onclick = async () => {
//       drilledTableVisualizer(
//         userQuery,
//         "Drill Down",
//         columnName,
//         decodeURIComponent(sqlQuery)
//       );
//       popupDiv.remove();
//     };
//     popupDiv.appendChild(drillDownBtn);
//   }

//   // Drill Across button
//   if (drillOptions.includes("Drill Across")) {
//     const drillAcrossBtn = document.createElement("button");
//     drillAcrossBtn.textContent = "Drill Across";
//     drillAcrossBtn.onclick = async () => {
//       drilledTableVisualizer(
//         userQuery,
//         "Drill Across",
//         columnName,
//         decodeURIComponent(sqlQuery)
//       );
//       popupDiv.remove();
//     };
//     popupDiv.appendChild(drillAcrossBtn);
//   }

//   // Style the popup
//   popupDiv.style.position = "absolute";
//   popupDiv.style.top = `${event.pageY}px`;
//   popupDiv.style.left = `${event.pageX}px`;
//   popupDiv.style.padding = "15px";
//   popupDiv.style.backgroundColor = "#fff";
//   popupDiv.style.border = "1px solid #ccc";
//   popupDiv.style.boxShadow = "0px 4px 6px rgba(0,0,0,0.1)";
//   popupDiv.style.zIndex = "1000";
//   popupDiv.style.width = "200px";
//   popupDiv.style.display = "flex";
//   popupDiv.style.flexDirection = "column";
//   popupDiv.style.alignItems = "flex-start";

//   // Append popup to body
//   document.body.appendChild(popupDiv);

//   // Event listener to close the popup when clicking outside
//   const closeOnClickOutside = (e) => {
//     if (!popupDiv.contains(e.target)) {
//       popupDiv.remove();
//       document.removeEventListener("click", closeOnClickOutside);
//     }
//   };

//   // Add event listener after the current stack clears
//   setTimeout(() => {
//     document.addEventListener("click", closeOnClickOutside);
//   }, 0);
// }

// Close existing popup if any
function closeExistingPopup() {
  const existingPopup = document.querySelector(".popup");
  if (existingPopup) existingPopup.remove();
}
