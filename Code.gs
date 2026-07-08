function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || "{}");

    if (data.action === "createPost") return createPost(data);
    if (data.action === "updateStatus") return updateStatus(data);

    return jsonResponse({
      success: false,
      message: "invalid action"
    });

  } catch (err) {
    return jsonResponse({
      success: false,
      message: err.toString()
    });
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action || "getPosts";

    if (action === "getAllPosts") return getPosts(true);

    return getPosts(false);

  } catch (err) {
    return jsonResponse({
      success: false,
      message: err.toString(),
      posts: []
    });
  }
}

function createPost(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("post");

  if (!sheet) {
    return jsonResponse({
      success: false,
      message: "Sheet 'post' not found"
    });
  }

  const allowedTypes = [
    "School Advisory",
    "News",
    "Event",
    "Reminder"
  ];

  if (!allowedTypes.includes(data.type)) {
    return jsonResponse({
      success: false,
      message: "invalid type"
    });
  }

  const id = new Date().getTime();

  sheet.appendRow([
    id,
    data.type,
    data.title,
    data.message,
    data.author,
    new Date(),
    data.image || "",
    data.attachment || "",
    data.status || "Published"
  ]);

  return jsonResponse({
    success: true,
    message: "post saved",
    id: id
  });
}

function getPosts(includeDeleted) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("post");

  if (!sheet) {
    return jsonResponse({
      success: false,
      message: "Sheet 'post' not found",
      posts: []
    });
  }

  const rows = sheet.getDataRange().getValues();
  const posts = [];

  for (let i = 1; i < rows.length; i++) {
    const status = rows[i][8] || "Published";

    if (!includeDeleted && status !== "Published") {
      continue;
    }

    posts.push({
      id: rows[i][0],
      type: rows[i][1],
      title: rows[i][2],
      message: rows[i][3],
      author: rows[i][4],
      date: rows[i][5],
      image: rows[i][6] || "",
      attachment: rows[i][7] || "",
      status: status
    });
  }

  return jsonResponse({
    success: true,
    posts: posts
  });
}

function updateStatus(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("post");

  if (!sheet) {
    return jsonResponse({
      success: false,
      message: "Sheet 'post' not found"
    });
  }

  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      sheet.getRange(i + 1, 9).setValue(data.status);

      return jsonResponse({
        success: true,
        message: "status updated"
      });
    }
  }

  return jsonResponse({
    success: false,
    message: "post not found"
  });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
