const tableContainer = document.getElementById("table-container");
const sqlQueryContainer = document.getElementById("sql-query-container");
const messageContainer = document.getElementById("message-container");
let startTime; // Track start time globally

// Show loading indicator with dynamic timer
function showLoadingIndicator() {
  startTime = Date.now();
  messageContainer.innerHTML = `<div class="loading-indicator"><br><br><strong>Loading...</strong></div>`;
  tableContainer.style.display = "none";
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
  messageContainer.innerHTML = "";
  tableContainer.style.display = "block";
}

function clearPreviousState() {
  tableContainer.innerHTML = "";
  sqlQueryContainer.innerHTML = "";
  messageContainer.innerHTML = "";
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
    alert("Error processing query. Please try again.");
    alert("Error processing query. Please try again.");
  }
}

async function initialTableVisualizer(userQuery) {
  const jsonData = await fetchInitialData(userQuery);
  logger.addPlaceholderLog("First Fetch", jsonData.sql_query);
  visualizeTable(jsonData);
}

async function fetchInitialData(userQuery) {
  showLoadingIndicator();
  try {
    const response = await fetch("http://127.0.0.1:8000/fetch-data", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
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
    user_query: rawUserQuery,
    sql_query: rawSqlQuery,
    results: rawTableData,
    metadata_info: rawMetadataInfo,
  } = jsonData;

  console.log(rawMetadataInfo);
  logger.logAll();

  const userQuery = encodeURIComponent(rawUserQuery);
  const sqlQuery = encodeURIComponent(rawSqlQuery);
  const tableData = JSON.parse(rawTableData);
  const metadataInfo = encodeURIComponent(JSON.stringify(rawMetadataInfo));

  if (tableData.data.length === 0) {
    messageContainer.innerHTML = `<strong>Nothing to display.</strong>`;
    nothingToDisplay();
    return;
  }

  let tableHtml = "<table><thead><tr>";
  tableData.schema.fields.forEach((col) => {
    tableHtml += `<th>${generateClickableContent(
      col.name,
      "",
      metadataInfo,
      sqlQuery,
      userQuery,
      true
    )}</th>`;
  });
  tableHtml += "</tr></thead><tbody>";

  tableData.data.forEach((row) => {
    tableHtml += "<tr>";
    tableData.schema.fields.forEach((col) => {
      const cellContent = generateClickableContent(
        col.name,
        row[col.name],
        metadataInfo,
        sqlQuery,
        userQuery
      );
      tableHtml += `<td>${cellContent}</td>`;
    });
    tableHtml += "</tr>";
  });

  tableHtml += "</tbody></table>";
  tableContainer.innerHTML = tableHtml;
  sqlQueryContainer.innerHTML = `<pre>${rawSqlQuery}</pre>`;
  renderAccordionFromLogger();
}

function generateClickableContent(
  colName,
  cellValue = "",
  metadataInfo,
  sqlQuery,
  userQuery,
  isHeader = false
) {
  const capitalizedColName = transformString(colName);
  const isClickable = checkIfColumnIsDrillable(colName, metadataInfo);
  if (isClickable) {
    const onclickHandler = `handleColumnClick(event, &quot;${userQuery}&quot;, '${colName}', &quot;${metadataInfo}&quot;, &quot;${sqlQuery}&quot;, &quot;${cellValue}&quot;)`;
    return `<a href="javascript:void(0);" class="clickable" onclick="${onclickHandler}">${
      isHeader ? capitalizedColName : cellValue
    }</a>`;
  }
  return isHeader ? capitalizedColName : cellValue;
}
function handleColumnClick(
  event,
  userQuery,
  columnName,
  metadataInfo,
  sqlQuery,
  rowValue
) {
  event.preventDefault();
  try {
    metadataInfo = JSON.parse(decodeURIComponent(metadataInfo));
  } catch (err) {
    console.error("Error parsing metadataInfo:", err);
    alert("Error parsing metadataInfo");
    return;
  }

  const options = getDrillOptions(columnName, metadataInfo);
  if (!options.length) {
    console.warn("No drill options available for column:", columnName);
    alert("No drill options available for column: " + columnName);
    return;
  }

  createPopup(
    event.pageX,
    event.pageY,
    userQuery,
    columnName,
    sqlQuery,
    options,
    rowValue
  );
}

function createPopup(x, y, userQuery, columnName, sqlQuery, options, rowValue) {
  closeExistingPopup();

  const popup = document.createElement("div");
  popup.className = "popup";

  popup.style.cssText = `
    position: absolute; 
    top: ${y}px; 
    left: ${x}px; 
    padding: 10px; 
    background: #fff; 
    border: 1px solid #ccc; 
    box-shadow: 0px 4px 6px rgba(0,0,0,0.1); 
    z-index: 1000; 
    padding: 5px;
    width: 200px; 
    display: flex; 
    flex-direction: column; 
    border-radius: 8px;
  `;

  const closeButton = document.createElement("button");
  closeButton.textContent = "X";
  closeButton.style.cssText = `
    align-self: flex-end; margin-bottom: 2px; border: none; background: transparent; cursor: pointer;
  `;

  closeButton.onclick = () => popup.remove();

  popup.appendChild(closeButton);

  options.forEach((option) => {
    const button = document.createElement("button");
    button.textContent = option;
    button.style.marginTop = "5px";
    button.onclick = async () => {
      drilledTableVisualizer(
        userQuery,
        option,
        columnName,
        decodeURIComponent(sqlQuery),
        rowValue
      );
      popup.remove();
    };
    popup.appendChild(button);
  });

  document.body.appendChild(popup);

  // Measure popup dimensions
  const popupHeight = popup.offsetHeight;
  const popupWidth = popup.offsetWidth;
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  // Calculate vertical position
  const positionAbove = y + popupHeight > viewportHeight;
  const adjustedY = positionAbove ? y - popupHeight : y;

  // Calculate horizontal position
  const positionLeft = x + popupWidth > viewportWidth;
  const adjustedX = positionLeft ? x - popupWidth : x;

  // Apply final positions
  popup.style.top = `${adjustedY}px`;
  popup.style.left = `${adjustedX}px`;

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
  metadataInfo = JSON.parse(decodeURIComponent(metadataInfo));
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
  sqlQuery,
  rowValue
) {
  const capitalizedColName = transformString(columnName);
  const capitalizedRowValue = transformString(rowValue);
  const logEntry = logger.addPlaceholderLog(
    `${buttonName} on ${
      rowValue
        ? `Row Value: ${capitalizedRowValue} | Header: ${capitalizedColName}`
        : `Header:${capitalizedColName}`
    }`,
    sqlQuery
  );

  const jsonData = await fetchDrilledData(
    userQuery,
    buttonName,
    columnName,
    sqlQuery,
    rowValue
  );
  logger.updateLogSql(logEntry, jsonData.sql_query);

  visualizeTable(jsonData);
}

async function fetchDrilledData(
  userQuery,
  buttonName,
  columnName,
  sqlQuery,
  rowValue
) {
  showLoadingIndicator();
  try {
    const response = await fetch("http://127.0.0.1:8000/perform-drilling", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        user_query: decodeURIComponent(userQuery),
        sql_query: sqlQuery,
        drilling_metadata: {
          column_name: columnName,
          column_value: rowValue, // functionality for row-specific drilling
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

function transformString(input) {
  return input.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function nothingToDisplay() {
  tableContainer.style.display = "none";
  const goBackButton = document.createElement("button");
  goBackButton.textContent = "<=== Go Back";
  goBackButton.style.cssText = `
    align-self: flex-end; margin: 10px 0 0 10px; cursor: pointer;
  `;

  goBackButton.onclick = () => {
    messageContainer.innerHTML = "";
    tableContainer.style.display = "block";
  };

  messageContainer.appendChild(goBackButton);
}

const logger = {
  logs: [],
  // Add a placeholder log before fetching drilled data
  addPlaceholderLog(title, initialSqlQuery) {
    const logEntry = { title, sql: initialSqlQuery };
    this.logs.push(logEntry);
    return logEntry;
  },
  // Update the SQL query of a specific log entry
  updateLogSql(logEntry, updatedSqlQuery) {
    logEntry.sql = updatedSqlQuery;
  },
  // Access and log all entries
  logAll() {
    console.log("Logger Data:");
    this.logs.forEach((log, index) => {
      console.log(`Log ${index + 1}: ${log.title}, SQL: ${log.sql}`);
    });
  },
};

function renderAccordionFromLogger() {
  sqlQueryContainer.innerHTML = "";

  if (logger.logs.length === 0) {
    sqlQueryContainer.innerHTML = "<strong>No queries logged yet.</strong>";
    return;
  }

  const accordion = document.createElement("div"); // Container for accordion
  accordion.style.cssText = `
      border: 1px solid #ddd;
      border-radius: 5px;
      overflow: hidden;
      box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);
  `;

  logger.logs.forEach((entry, index) => {
    const accordionItem = document.createElement("div");
    accordionItem.style.cssText = `
          border-bottom: 2px solid #ddd;
      `;

    // Accordion Title
    const title = document.createElement("div");
    title.textContent = entry.title;
    title.style.cssText = `
          padding: 10px;
          cursor: pointer;
          background-color: #f9f9f9;
          font-weight: bold;
      `;
    title.onclick = () => {
      const content = accordionItem.querySelector(".accordion-content");
      const isVisible = content.style.display === "block";
      content.style.display = isVisible ? "none" : "block";

      // Only the last accordion item should be opened and other should be closed by default
      for (const otherItem of accordion.children) {
        if (otherItem !== accordionItem) {
          otherItem.querySelector(".accordion-content").style.display = "none";
        }
      }
    };

    // Accordion Content
    const content = document.createElement("div");
    content.className = "accordion-content";
    content.style.cssText = `
          display: ${index === logger.logs.length - 1 ? "block" : "none"};
          padding: 10px;
          background-color: #fff;
          border-top: 1px solid #ddd;
          white-space: pre-wrap;
          overflow: auto;
      `;
    content.textContent = entry.sql;

    // Append to accordion item
    accordionItem.appendChild(title);
    accordionItem.appendChild(content);
    accordion.appendChild(accordionItem);
  });

  sqlQueryContainer.appendChild(accordion);
}
