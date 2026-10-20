//web Route
const express = require("express");
const router = express.Router();

const {
  // Pages
  allpages,
  addpages,
  updatepage,
  softdeletepage,

  // Sections
  addsection,
  getsectionbypage,
  updatesection,
  softdeletesection,

  // Contents
  getallcontent,
  getcontentbysection,
  addcontent,
  updatecontent,
  softdeletecontent,
} = require("../controllers/webcontroller");

/* ----------------------------- PAGE ROUTES ----------------------------- */

// GET all pages
router.get("/pages", allpages);

// CREATE a new page
router.post("/pages", addpages);

// UPDATE a page by id
router.put("/pages/:id", updatepage);

// SOFT DELETE a page by id
router.delete("/pages/:id", softdeletepage);

/* ---------------------------- SECTION ROUTES --------------------------- */

// CREATE a new section
router.post("/sections", addsection);

// GET all sections belonging to a page
router.get("/sections/page/:pageId", getsectionbypage);

// UPDATE a section by id
router.put("/sections/:id", updatesection);

// SOFT DELETE a section by id
router.delete("/sections/:id", softdeletesection);

/* ---------------------------- CONTENT ROUTES --------------------------- */

// GET all contents
router.get("/contents", getallcontent);

// GET contents by section id
router.get("/contents/section/:sectionId", getcontentbysection);

// CREATE a new content
router.post("/contents", addcontent);

// UPDATE a content by id
router.put("/contents/:id", updatecontent);

// SOFT DELETE a content by id
router.delete("/contents/:id", softdeletecontent);

module.exports = router;
