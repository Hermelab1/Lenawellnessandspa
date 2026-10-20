const { WebPages, WebPageSections, WebContents } = require("../models");

/* ------------------------- PAGE CONTROLLERS ------------------------- */

// GET all pages (exclude soft deleted)
async function allpages(req, res) {
  try {
    const pages = await WebPages.findAll({
      where: { isDeleted: false },
      include: [
        {
          model: WebPageSections,
          as: "sections",
          where: { isDeleted: false },
          required: false,
          include: [
            {
              model: WebContents,
              as: "contents",
              where: { isDeleted: false },
              required: false,
            },
          ],
        },
      ],
    });

    return res.status(200).json({ success: true, data: pages });
  } catch (error) {
    console.error("allpages error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// CREATE a new page
async function addpages(req, res) {
  try {
    const { pageName, subPageName, pageDescription } = req.body;

    if (!pageName) {
      return res
        .status(400)
        .json({ success: false, message: "pageName is required" });
    }

    const newPage = await WebPages.create({
      pageName,
      subPageName,
      pageDescription,
    });

    return res.status(201).json({ success: true, data: newPage });
  } catch (error) {
    console.error("addpages error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// UPDATE page
async function updatepage(req, res) {
  try {
    const { id } = req.params;
    const { pageName, subPageName, pageDescription } = req.body;

    const page = await WebPages.findOne({
      where: { id, isDeleted: false },
    });

    if (!page) {
      return res
        .status(404)
        .json({ success: false, message: "Page not found" });
    }

    await page.update({ pageName, subPageName, pageDescription });

    return res.status(200).json({ success: true, data: page });
  } catch (error) {
    console.error("updatepage error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// SOFT DELETE page
async function softdeletepage(req, res) {
  try {
    const { id } = req.params;

    const page = await WebPages.findOne({
      where: { id, isDeleted: false },
    });

    if (!page) {
      return res
        .status(404)
        .json({ success: false, message: "Page not found" });
    }

    await page.update({ isDeleted: true });

    // Cascade soft delete to sections & contents
    await WebPageSections.update(
      { isDeleted: true },
      { where: { pageId: id } },
    );

    const sections = await WebPageSections.findAll({
      where: { pageId: id },
      attributes: ["id"],
    });

    const sectionIds = sections.map((s) => s.id);

    if (sectionIds.length) {
      await WebContents.update(
        { isDeleted: true },
        { where: { sectionId: sectionIds } },
      );
    }

    return res
      .status(200)
      .json({ success: true, message: "Page soft deleted" });
  } catch (error) {
    console.error("softdeletepage error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/* ------------------------- SECTION CONTROLLERS ------------------------- */

// CREATE section
async function addsection(req, res) {
  try {
    const { pageId, sectionName } = req.body;

    if (!pageId || !sectionName) {
      return res.status(400).json({
        success: false,
        message: "pageId and sectionName are required",
      });
    }

    const page = await WebPages.findOne({
      where: { id: pageId, isDeleted: false },
    });

    if (!page) {
      return res
        .status(404)
        .json({ success: false, message: "Parent page not found" });
    }

    const section = await WebPageSections.create({ pageId, sectionName });

    return res.status(201).json({ success: true, data: section });
  } catch (error) {
    console.error("addsection error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// GET sections by page
async function getsectionbypage(req, res) {
  try {
    const { pageId } = req.params;

    const sections = await WebPageSections.findAll({
      where: { pageId, isDeleted: false },
      include: [
        {
          model: WebContents,
          as: "contents",
          where: { isDeleted: false },
          required: false,
        },
      ],
    });

    return res.status(200).json({ success: true, data: sections });
  } catch (error) {
    console.error("getsectionbypage error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// UPDATE section
async function updatesection(req, res) {
  try {
    const { id } = req.params;
    const { sectionName } = req.body;

    const section = await WebPageSections.findOne({
      where: { id, isDeleted: false },
    });

    if (!section) {
      return res
        .status(404)
        .json({ success: false, message: "Section not found" });
    }

    await section.update({ sectionName });

    return res.status(200).json({ success: true, data: section });
  } catch (error) {
    console.error("updatesection error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// SOFT DELETE section
async function softdeletesection(req, res) {
  try {
    const { id } = req.params;

    const section = await WebPageSections.findOne({
      where: { id, isDeleted: false },
    });

    if (!section) {
      return res
        .status(404)
        .json({ success: false, message: "Section not found" });
    }

    await section.update({ isDeleted: true });
    await WebContents.update({ isDeleted: true }, { where: { sectionId: id } });

    return res
      .status(200)
      .json({ success: true, message: "Section soft deleted" });
  } catch (error) {
    console.error("softdeletesection error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/* ------------------------- CONTENT CONTROLLERS ------------------------- */

// GET all contents
async function getallcontent(req, res) {
  try {
    const contents = await WebContents.findAll({
      where: { isDeleted: false },
    });

    return res.status(200).json({ success: true, data: contents });
  } catch (error) {
    console.error("getallcontent error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// GET contents by section
async function getcontentbysection(req, res) {
  try {
    const { sectionId } = req.params;

    const contents = await WebContents.findAll({
      where: { sectionId, isDeleted: false },
    });

    return res.status(200).json({ success: true, data: contents });
  } catch (error) {
    console.error("getcontentbysection error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// CREATE content
async function addcontent(req, res) {
  try {
    const { sectionId, content, contentType, contentImages } = req.body;

    if (!sectionId || !content || !contentType) {
      return res.status(400).json({
        success: false,
        message: "sectionId, content, and contentType are required",
      });
    }

    const section = await WebPageSections.findOne({
      where: { id: sectionId, isDeleted: false },
    });

    if (!section) {
      return res
        .status(404)
        .json({ success: false, message: "Parent section not found" });
    }

    const newContent = await WebContents.create({
      sectionId,
      content,
      contentType,
      contentImages,
    });

    return res.status(201).json({ success: true, data: newContent });
  } catch (error) {
    console.error("addcontent error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// UPDATE content
async function updatecontent(req, res) {
  try {
    const { id } = req.params;
    const { content, contentType, contentImages } = req.body;

    const existing = await WebContents.findOne({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Content not found" });
    }

    await existing.update({ content, contentType, contentImages });

    return res.status(200).json({ success: true, data: existing });
  } catch (error) {
    console.error("updatecontent error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// SOFT DELETE content
async function softdeletecontent(req, res) {
  try {
    const { id } = req.params;

    const existing = await WebContents.findOne({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Content not found" });
    }

    await existing.update({ isDeleted: true });

    return res
      .status(200)
      .json({ success: true, message: "Content soft deleted" });
  } catch (error) {
    console.error("softdeletecontent error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  allpages,
  addpages,
  updatepage,
  softdeletepage,
  addsection,
  getsectionbypage,
  updatesection,
  softdeletesection,
  getallcontent,
  getcontentbysection,
  addcontent,
  updatecontent,
  softdeletecontent,
};
