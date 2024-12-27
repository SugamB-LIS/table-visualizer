const backendBaseUrl = "https://dev-inteliome.yco.com.np/backend/api/v1";
const jwtToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzM1MjkyODE5LCJpYXQiOjE3MzUyNzg0MTksImp0aSI6ImI0ZjZkYWUyY2I0MDQ2OTNiNDgwZjgwYTdiOWIzM2EyIiwidXNlcl9pZCI6Ijk1NzRmMmY1LTQ1NjYtNGI4ZS1iNzE5LTRiZWI5MzBmZDEzOCIsInJvbGVzIjpbIlVTRVIiXSwidXNlcm5hbWUiOiJuaXNhbjEyMyJ9.wyBY_la2U8dPKlSoE62H5vtNOpUGGerHrX1WsVe4oxQ";
const chatId = "fa7e2df2-efaf-4ccd-ba6f-d564916d00d2";
const conversationId = "ebc97c10-a778-4b19-a153-ad6da04a44af";

const tableContainer = document.getElementById("table-container");
const sqlQueryContainer = document.getElementById("sql-query-container");
const messageContainer = document.getElementById("message-container");
let startTime; // Track start time globally
let firstColumnName; //Track the first column name that was clicked

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
  console.clear();
  tableContainer.innerHTML = "";
  sqlQueryContainer.innerHTML = "";
  messageContainer.innerHTML = "";
  closeExistingPopup();
  logger.logs = []; // Clear all logs
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
  }
}

async function initialTableVisualizer(userQuery) {
  const queueData = await fetchInitialData(userQuery);
  const queueId = queueData.data;

  try {
    const jsonData = await checkQueuePolling(queueId);
    console.log("\n\njsonData:", jsonData);
    logger.addPlaceholderLog(
      "First Fetch",
      jsonData.data.sql_query + "\n\nEXPLANATION:\n" + jsonData.data.explanation
    );
    visualizeTable(jsonData);
    // console.clear();
  } catch (error) {
    console.error("Failed to visualize table:", error);
  }
}

async function fetchInitialData(userQuery) {
  showLoadingIndicator();
  try {
    const response = await fetch(
      `${backendBaseUrl}/chat-sessions/${chatId}/ask/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({ query: userQuery }),
      }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

// Queue messages: PENDING, FAILED, SUCCESS
async function checkQueuePolling(queueId) {
  console.log("Checking queue:", queueId);

  try {
    const response = await fetch(`${backendBaseUrl}/check-queue/${queueId}/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    });

    const data = await response.json();
    // If the queue is still pending, wait and poll again
    if (data.message === "PENDING") {
      console.log("Queue is pending. Retrying...");
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Pause execution for 1 second
      return await checkQueuePolling(queueId); // Recursively poll
    }

    // If not pending, return the data
    console.log("Data fetched:", data.message);
    hideLoadingIndicator();
    return data;
  } catch (error) {
    console.error("Error when Queue Polling:", error);
    throw error;
  }
}

async function visualizeTable(jsonData, drilling = false) {
  let rawUserQuery, rawSqlQuery, rawTableData, rawDrillableColumns;
  const resolvedData = jsonData.data;
  // object keys are different based on first fetch or drilling api call
  if (drilling) {
    rawUserQuery = resolvedData.user_query;
    rawSqlQuery = resolvedData.sql_query;
    rawTableData = resolvedData.results;
    rawDrillableColumns = resolvedData.drillable_columns;
  } else {
    rawUserQuery = resolvedData.query;
    rawSqlQuery = resolvedData.sql_query;
    rawTableData = resolvedData.table;
    rawDrillableColumns = resolvedData.drillable_columns;
  }

  logger.logAll();

  const userQuery = encodeURIComponent(rawUserQuery);
  const sqlQuery = encodeURIComponent(rawSqlQuery);
  const tableData = JSON.parse(rawTableData);
  const metadataInfo = encodeURIComponent(JSON.stringify(rawDrillableColumns));

  console.log("tableData length is: ", tableData.data.length);
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
  const capitalizedColName = upperCaseString(colName);
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

  let parsedMetadata;
  try {
    parsedMetadata = JSON.parse(decodeURIComponent(metadataInfo));
  } catch (err) {
    console.error("Error parsing metadataInfo:", err);
    alert("Invalid metadata information.");
    return;
  }

  const options = getDrillOptions(columnName, parsedMetadata);
  if (options.length === 0) {
    console.warn("No drill options available for column:", columnName);
    alert(`No drill options available for column: ${columnName}`);
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

  const closeButton = document.createElement("button");
  closeButton.textContent = "X";
  closeButton.className = "close";
  closeButton.onclick = () => popup.remove();
  popup.appendChild(closeButton);

  options.forEach((option) => {
    const button = document.createElement("button");
    button.textContent = option;
    button.style.marginTop = "5px";
    button.onclick = async () => {
      firstColumnName = firstColumnName ? firstColumnName : columnName;
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

  // Adjust position dynamically
  const popupHeight = popup.offsetHeight;
  const popupWidth = popup.offsetWidth;
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  const adjustedY = y + popupHeight > viewportHeight ? y - popupHeight : y;
  const adjustedX = x + popupWidth > viewportWidth ? x - popupWidth : x;

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
  if (!Array.isArray(metadataInfo)) {
    console.error("Expected metadataInfo to be an array");
    return false;
  }
  // Check if column is drillable
  return metadataInfo.some((col) => col.column === columnName);
}

function getDrillOptions(columnName, metadataInfo) {
  // Flatten metadataInfo and find the column
  const column = metadataInfo.find((col) => {
    return col.column === columnName;
  });

  // Return appropriate drill options after transforming them
  return column ? column.drill_types.map(upperCaseString) : [];
}

async function drilledTableVisualizer(
  userQuery,
  buttonName,
  columnName,
  sqlQuery,
  rowValue
) {
  console.log("drilledTableVisualizer: ", buttonName);
  const capitalizedColName = upperCaseString(columnName);
  const capitalizedRowValue = upperCaseString(rowValue);
  const logEntry = logger.addPlaceholderLog(
    `${buttonName} on ${
      rowValue
        ? `Row Value: ${capitalizedRowValue} | Header: ${capitalizedColName}`
        : `Header: ${capitalizedColName}`
    }`,
    sqlQuery
  );
  console.log(
    `${buttonName} on ${
      rowValue
        ? `Row Value: ${capitalizedRowValue} | Header: ${capitalizedColName}`
        : `Header: ${capitalizedColName}`
    }`
  );
  const queueData = await fetchDrilledData(
    userQuery,
    buttonName,
    columnName,
    sqlQuery,
    rowValue
  );

  const queueId = queueData.data;

  try {
    const jsonData = await checkQueuePolling(queueId);
    console.log("\n\njsonData:", jsonData);
    logger.updateLogSql(logEntry, jsonData.data.sql_query);
    visualizeTable(jsonData, true);
  } catch (error) {
    console.error("Failed to visualize table:", error);
  }
}

async function fetchDrilledData(
  userQuery,
  buttonName,
  columnName,
  sqlQuery,
  rowValue
) {
  console.log("got to fetchDrilledData");
  showLoadingIndicator();
  console.log(
    "firstColumnName: ",
    firstColumnName,
    "\ncolumnName:",
    columnName
  );
  const reqBodyObj = {
    user_query: decodeURIComponent(userQuery),
    sql_query: sqlQuery,
    drill_type: drillTypeEnumString(buttonName),
    column_name: columnName,
    parent_drill_column: firstColumnName ? firstColumnName : columnName,
  };
  if (rowValue) {
    reqBodyObj.column_value = rowValue;
  }
  const reqBody = JSON.stringify(reqBodyObj);
  console.log("reqBody: ", reqBody);
  try {
    const response = await fetch(
      `${backendBaseUrl}/chat-sessions/${chatId}/drill/${conversationId}/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: reqBody,
      }
    );

    const data = await response.json();
    console.log("fetchDrilledData data: ", data);
    return data;
  } catch (error) {
    console.error("Error fetching drilled data:", error);
    throw error;
  }
}

function drillTypeEnumString(input) {
  const upperCasedSnakeString = input.toUpperCase().replace(/\s+/g, "_");
  return upperCasedSnakeString;
}
function upperCaseString(input) {
  const upperCasedString = input
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return upperCasedString;
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
    logger.logs.pop();
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

  const accordion = document.createElement("div");
  accordion.className = "accordion-container";

  logger.logs.forEach((entry, index) => {
    const accordionItem = document.createElement("div");
    accordionItem.className = "accordion-item";

    const title = document.createElement("div");
    title.className = "accordion-title";
    title.textContent = `${index + 1}: ${entry.title}`;
    title.onclick = () => {
      const content = accordionItem.querySelector(".accordion-content");
      content.style.display =
        content.style.display === "block" ? "none" : "block";
    };

    const content = document.createElement("div");
    content.className = "accordion-content";
    content.textContent = entry.sql;

    accordionItem.appendChild(title);
    accordionItem.appendChild(content);
    accordion.appendChild(accordionItem);
  });

  sqlQueryContainer.appendChild(accordion);
}
