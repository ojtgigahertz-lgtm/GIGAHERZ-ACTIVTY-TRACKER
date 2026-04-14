/**
 * Gigahertz Activity Tracker - Google Apps Script Backend
 */

const SHEET_ID = PropertiesService.getScriptProperties().getProperty('SHEET_ID') || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'; // Default sample sheet or create new
const TASKS_SHEET = 'Tasks';
const USERS_SHEET = 'Users';
const USERS = {
  'GHZ0001': { id: 'uid_001', empId: 'GHZ0001', firstName: 'Izumi', lastName: 'Miyamura', dept: 'PRODUCT DEPARTMENT', password: 'izumipassword' },
  'GHZ0002': { id: 'uid_002', empId: 'GHZ0002', firstName: 'Lexi', lastName: 'Vanguard', dept: 'MARKETING', password: 'lexipassword' },
  'GHZ0025': { id: 'uid_025', empId: 'GHZ0025', firstName: 'Employee', lastName: '25', dept: 'IT', password: 'password123' }
};

function doGet() {
  const template = HtmlService.createTemplateFromFile('index');
  return template.evaluate()
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function loginUser(data) {
  try {
    const empId = data.identifier.toUpperCase();
    const user = USERS[empId];
    if (user && user.password === data.password) {
      user.lastLoginAt = new Date().toISOString();
      user.loginCount = (user.loginCount || 0) + 1;
      console.log(`Login success for ${empId}`);
      return { success: true, user };
    }
    console.log(`Login failed for ${empId}`);
    return { success: false, error: 'Invalid credentials.' };
  } catch (e) {
    console.error('Login error:', e);
    return { success: false, error: e.message };
  }
}

function getTasks(data) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TASKS_SHEET) || createSheets();
    const tasks = sheet.getDataRange().getValues().slice(1).filter(row => row[1] == data.userId).map(row => ({
      id: row[0],
      userId: row[1],
      empId: row[2],
      taskName: row[3],
      date: row[4],
      startTime: row[5],
      endTime: row[6],
      durationMinutes: row[7],
      remarks: row[8]
    }));
    return { success: true, tasks };
  } catch (e) {
    console.error('Get tasks error:', e);
    return { success: false, error: e.message };
  }
}

function addTask(data) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TASKS_SHEET) || createSheets();
    sheet.appendRow([
      data.id || Utilities.getUuid(),
      data.userId,
      data.empId,
      data.taskName,
      data.date,
      data.startTime,
      data.endTime || '',
      data.durationMinutes,
      data.remarks || ''
    ]);
    console.log(`Task added: ${data.taskName}`);
    return { success: true };
  } catch (e) {
    console.error('Add task error:', e);
    return { success: false, error: e.message };
  }
}

function updateTaskRemark(data) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TASKS_SHEET);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] == data.taskId) {
        values[i][8] = data.remarks;
        dataRange.setValues(values);
        return { success: true };
      }
    }
    return { success: false, error: 'Task not found' };
  } catch (e) {
    console.error('Update remark error:', e);
    return { success: false, error: e.message };
  }
}

function timerStart(data) {
  try {
    // Log timer start to tasks or separate timers sheet
    const timerId = Utilities.getUuid();
    console.log(`Timer started for ${data.empId}: ${data.taskName}`);
    return { success: true, timerId };
  } catch (e) {
    console.error('Timer start error:', e);
    return { success: false, error: e.message };
  }
}

function timerStop(data) {
  try {
    console.log(`Timer stopped for ${data.empId}: ${data.taskName} (${data.durationSeconds}s)`);
    return { success: true };
  } catch (e) {
    console.error('Timer stop error:', e);
    return { success: false, error: e.message };
  }
}

function updatePhoto(data) {
  try {
    // Store photo in PropertiesService or user row
    const props = PropertiesService.getUserProperties();
    props.setProperty(`photo_${data.userId}`, data.photoBase64);
    return { success: true, lastPhotoUpdate: new Date().toISOString() };
  } catch (e) {
    console.error('Update photo error:', e);
    return { success: false, error: e.message };
  }
}

function changePassword(data) {
  try {
    const empId = getEmpIdFromUserId(data.userId);
    if (USERS[empId] && USERS[empId].password === data.currentPassword) {
      USERS[empId].password = data.newPassword;
      console.log(`Password changed for ${empId}`);
      return { success: true };
    }
    return { success: false, error: 'Current password incorrect' };
  } catch (e) {
    console.error('Change password error:', e);
    return { success: false, error: e.message };
  }
}

function batchLogActivities(data) {
  try {
    console.log(`Batch logged ${data.events.length} activities`);
    // Log to separate Activities sheet
    return { success: true };
  } catch (e) {
    console.error('Batch log error:', e);
    return { success: false };
  }
}

function createSheets() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  if (!ss.getSheetByName(USERS_SHEET)) {
    const usersSheet = ss.insertSheet(USERS_SHEET);
    usersSheet.getRange(1,1,1,9).setValues([['id','empId','firstName','lastName','dept','password','photoBase64','lastPhotoUpdate','loginCount']]);
    Object.values(USERS).forEach((user,i) => {
      usersSheet.appendRow([user.id, user.empId, user.firstName, user.lastName, user.dept, user.password, '', '', 0]);
    });
  }
  if (!ss.getSheetByName(TASKS_SHEET)) {
    const tasksSheet = ss.insertSheet(TASKS_SHEET);
    tasksSheet.getRange(1,1,1,9).setValues([['id','userId','empId','taskName','date','startTime','endTime','durationMinutes','remarks']]);
  }
  return ss.getSheetByName(TASKS_SHEET);
}

function getEmpIdFromUserId(userId) {
  // Simple lookup, in prod use sheet
  for (let empId in USERS) {
    if (USERS[empId].id === userId) return empId;
  }
  return null;
}

