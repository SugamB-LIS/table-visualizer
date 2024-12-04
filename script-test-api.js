const tableContainer = document.getElementById("table-container");
const sqlQueryContainer = document.getElementById("sql-query-container");

let startTime; // Track start time globally

// Show loading indicator with dynamic timer
function showLoadingIndicator() {
  startTime = Date.now();
  tableContainer.innerHTML = `<div class="loading-indicator"><br><br>Loading...</div>`;

  const updateTime = () => {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    const timeText =
      minutes > 0
        ? `Loading... (${minutes} minute${
            minutes > 1 ? "s" : ""
          } ${seconds} second${seconds !== 1 ? "s" : ""})`
        : `Loading... (${seconds} second${seconds !== 1 ? "s" : ""})`;

    const loadingIndicator = document.querySelector(".loading-indicator");
    if (loadingIndicator) {
      loadingIndicator.textContent = timeText;
      setTimeout(updateTime, 1000);
    }
  };

  updateTime();
}

// Hide loading indicator and log total time
function hideLoadingIndicator() {
  const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = elapsedTime % 60;
  const finalTimeText =
    minutes > 0
      ? `${minutes} minute${minutes > 1 ? "s" : ""} and ${seconds} second${
          seconds !== 1 ? "s" : ""
        }`
      : `${seconds} second${seconds !== 1 ? "s" : ""}`;

  console.log(`Data loaded in ${finalTimeText}.`);
  tableContainer.innerHTML = ""; // Clear the loading message
}

function clearPreviousState() {
  tableContainer.innerHTML = "";
  sqlQueryContainer.innerHTML = "";
  closeExistingPopup();
}

function closeExistingPopup() {
  const existingPopup = document.querySelector(".popup");
  if (existingPopup) existingPopup.remove();
}

async function processQuery(userQuery) {
  if (!userQuery.trim()) {
    alert("Please enter a valid query.");
    return;
  }

  clearPreviousState();

  try {
    console.log("Processing query:", userQuery);
    await initialTableVisualizer(userQuery);
  } catch (error) {
    console.error("Error processing query:", error);
  }
}

async function initialTableVisualizer(userQuery) {
  const jsonData = await fetchInitialData(userQuery);
  visualizeTable(jsonData);
}

async function fetchInitialData(userQuery) {
  showLoadingIndicator();
  try {
    const response = await fetch("http://127.0.0.1:8000/fetch-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_query: userQuery }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  } finally {
    hideLoadingIndicator();
  }
}

async function visualizeTable(jsonData) {
  const {
    user_query: userQuery,
    sql_query: sqlQuery,
    results: tableData,
    metadata_info: metadataInfo,
  } = jsonData;

  const parsedTableData = JSON.parse(tableData);

  let tableHtml = "<table><thead><tr>";
  parsedTableData.schema.fields.forEach((col) => {
    const isClickable = checkIfColumnIsDrillable(col.name, metadataInfo);
    tableHtml += `<th>
      ${
        isClickable
          ? `<a href="javascript:void(0);" class="clickable" onclick="handleColumnClick(event, &quot;${encodeURIComponent(
              userQuery
            )}&quot;, '${col.name}', &quot;${encodeURIComponent(
              JSON.stringify(metadataInfo)
            )}&quot;,&quot;${encodeURIComponent(sqlQuery)}&quot;)">${
              col.name
            }</a>`
          : col.name
      }
    </th>`;
  });

  tableHtml += "</tr></thead><tbody>";
  parsedTableData.data.forEach((row) => {
    tableHtml += "<tr>";
    parsedTableData.schema.fields.forEach((col) => {
      const isClickable = checkIfColumnIsDrillable(col.name, metadataInfo);
      // tableHtml += `<td>${
      //   isClickable
      //     ? `<a href="javascript:void(0);" class="clickable" onclick="handleRowClick(event, '${userQuery}', '${
      //         col.name
      //       }', '${encodeURIComponent(sqlQuery)}' )">${row[col.name]}</a>`
      //     : row[col.name]
      // }</td>`;
      tableHtml += `<td>${
        isClickable
          ? `<a href="javascript:void(0);" class="clickable" onclick="handleRowClick(event, &quot;${encodeURIComponent(
              userQuery
            )}&quot;)">${row[col.name]}</a>`
          : row[col.name]
      }</td>`;
    });

    tableHtml += "</tr>";
  });

  tableHtml += "</tbody></table>";
  tableContainer.innerHTML = tableHtml;
  sqlQueryContainer.innerHTML = `<pre>${sqlQuery}</pre>`;
}

// async function handleRowClick(event) {
async function handleRowClick(event, userQuery) {
  // async function handleRowClick(event, userQuery, columnName) {
  // async function handleRowClick(event, userQuery, columnName, sqlQuery) {
  const rowValue = event.target.innerHTML;
  const decodedUserQuery = decodeURIComponent(userQuery);

  console.log("handleRowClick:", decodedUserQuery, rowValue);
  // console.log("handleRowClick:", rowValue);
  // console.log("handleRowClick:", userQuery, rowValue);
  // console.log("handleRowClick:", columnName, sqlQuery, rowValue);
  // console.log("handleRowClick:", userQuery, columnName, sqlQuery, rowValue);

  // showLoadingIndicator();
  // try {
  //   const response = await fetch("http://127.0.0.1:8000/perform-drilling", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({
  //       user_query: userQuery,
  //       sql_query: sqlQuery,
  //       drilling_metadata: {
  //         column_name: columnName,
  //         column_value: rowValue,
  //         drill_across: false,
  //       },
  //     }),
  //   });

  //   const data = await response.json();
  //   return data;
  // } catch (error) {
  //   console.error("Error fetching drilled data:", error);
  //   throw error;
  // } finally {
  //   hideLoadingIndicator();
  // }
}

function handleColumnClick(
  event,
  userQuery,
  columnName,
  metadataInfo,
  sqlQuery
) {
  event.preventDefault();

  try {
    metadataInfo = JSON.parse(decodeURIComponent(metadataInfo));
  } catch (err) {
    console.error("Error parsing metadataInfo:", err);
    return;
  }

  const options = getDrillOptions(columnName, metadataInfo);
  if (!options.length) {
    console.warn("No drill options available for column:", columnName);
    return;
  }

  createPopup(
    event.pageX,
    event.pageY,
    encodeURIComponent(userQuery),
    columnName,
    sqlQuery,
    options
  );
}

function createPopup(x, y, userQuery, columnName, sqlQuery, options) {
  closeExistingPopup();

  const popup = document.createElement("div");
  popup.className = "popup";
  popup.style.cssText = `
    position: absolute; top: ${y}px; left: ${x}px; padding: 10px;
    background: #fff; border: 1px solid #ccc; box-shadow: 0px 4px 6px rgba(0,0,0,0.1);
    z-index: 1000; width: 200px; display: flex; flex-direction: column;
    border-radius: 8px;
  `;

  const closeButton = document.createElement("button");
  closeButton.textContent = "X";
  closeButton.style.cssText = `
    align-self: flex-end; margin-bottom: 5px; border: none; background: transparent; cursor: pointer;
  `;
  closeButton.onclick = () => popup.remove();

  popup.appendChild(closeButton);

  options.forEach((option) => {
    const button = document.createElement("button");
    button.textContent = option;
    button.style.marginTop = "5px";
    button.onclick = async () => {
      drilledTableVisualizer(
        encodeURIComponent(userQuery),
        option,
        columnName,
        decodeURIComponent(sqlQuery)
      );
      popup.remove();
    };
    popup.appendChild(button);
  });

  document.body.appendChild(popup);

  const outsideClickHandler = (e) => {
    if (!popup.contains(e.target)) {
      popup.remove();
      document.removeEventListener("click", outsideClickHandler);
    }
  };

  setTimeout(() => {
    document.addEventListener("click", outsideClickHandler);
  }, 0);
}

function checkIfColumnIsDrillable(columnName, metadataInfo) {
  if (!metadataInfo) return false;
  return Object.values(metadataInfo).some((group) =>
    group.some((col) => col.column_name === columnName)
  );
}
function getDrillOptions(columnName, metadataInfo) {
  const column = Object.values(metadataInfo)
    .flat()
    .find((col) => col.column_name === columnName);

  return column
    ? column.drill_across
      ? ["Drill Down", "Drill Across"]
      : ["Drill Down"]
    : [];
}

async function drilledTableVisualizer(
  userQuery,
  buttonName,
  columnName,
  sqlQuery
) {
  const jsonData = await fetchDrilledData(
    encodeURIComponent(userQuery),
    buttonName,
    columnName,
    sqlQuery
  );
  visualizeTable(jsonData);
}

async function fetchDrilledData(userQuery, buttonName, columnName, sqlQuery) {
  showLoadingIndicator();
  try {
    const response = await fetch("http://127.0.0.1:8000/perform-drilling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_query: decodeURIComponent(userQuery),
        sql_query: sqlQuery,
        drilling_metadata: {
          column_name: columnName,
          column_value: "", // Future functionality for row-specific drilling
          drill_across: buttonName === "Drill Across",
        },
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching drilled data:", error);
    throw error;
  } finally {
    hideLoadingIndicator();
  }
}

// processQuery("what is the department wise profit for the year 2022");
processQuery(
  "what is the department wise profit from date >= '2022-01-01' AND date < '2023-01-01'"
);
