"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");

const router = new express.Router();

/** POST / { job } =>  { job }
 *
 * job should be { title, salary, equity, companyHandle }
 *
 * Returns { title, salary, equity, companyHandle }
 *
 * Authorization required: login
 */

router.post("/", ensureLoggedIn, ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, jobNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const job = await Job.create(req.body);

    return res.status(201).json({ job });
  } catch (err) {
    return next(err);
  }
});

/** GET /  =>
 *   { jobs: [ { title, salary, equity, companyHandle }, ...] }
 *
 * Can filter on provided search filters:
 * - title
 * - minSalary
 * - hasEquity (will find case-insensitive, partial matches)
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  try {
    const title = req.query.title;
    const minSalary = req.query.minSalary;
    const hasEquity = req.query.hasEquity;

    const jobs = await Job.findAll(title, minSalary, hasEquity);

    return res.json({ jobs });
  } catch (err) {
    return next(err);
  }
});

/** GET /[title]  =>  { job }
 *
 *  job is { title, salary, equity, companyHandle, jobs }
 *   where jobs is [{ id, title, salary, equity }, ...]
 *
 * Authorization required: none
 */

router.get("/:title", async function (req, res, next) {
  try {
    const job = await Job.get(req.params.title);

    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[title] { fld1, fld2, ... } => { job }
 *
 * Patches job data.
 *
 * fields can be: { title, salary, equity, companyHandle }
 *
 * Returns { title, salary, equity, companyHandle }
 *
 * Authorization required: login
 */

router.patch(
  "/:title",
  ensureLoggedIn,
  ensureAdmin,
  async function (req, res, next) {
    try {
      const validator = jsonschema.validate(req.body, jobUpdateSchema);
      if (!validator.valid) {
        const errs = validator.errors.map(e => e.stack);
        throw new BadRequestError(errs);
      }

      const job = await Job.update(req.params.title, req.body);
      return res.json({ job });
    } catch (err) {
      return next(err);
    }
  }
);

/** DELETE /[title]  =>  { deleted: title }
 *
 * Authorization: login
 */

router.delete(
  "/:title",
  ensureLoggedIn,
  ensureAdmin,
  async function (req, res, next) {
    try {
      await Job.remove(req.params.title);
      return res.json({ deleted: req.params.title });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
