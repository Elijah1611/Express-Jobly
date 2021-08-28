"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, companyHandle }
   *
   * Returns { title, salary, equity, companyHandle }
   *
   * Throws BadRequestError if job already in database.
   * */

  static async create({ title, salary, equity, companyHandle }) {
    const equityCheck = equity <= 1.0;

    const salaryCheck = salary >= 0;

    const duplicateCheck = await db.query(
      `SELECT title
           FROM jobs
           WHERE LOWER(title) = $1`,
      [title.toLowerCase()]
    );

    if (!equityCheck)
      throw new BadRequestError(
        `Equity value for job is invalid (<= 1.0): ${equity}`
      );

    if (!salaryCheck)
      throw new BadRequestError(
        `Salary value for job is invalid (>= 0): ${salary}`
      );

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate job: ${title}`);

    const result = await db.query(
      `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING title, salary, equity, company_handle AS "companyHandle"`,
      [title, salary, equity, companyHandle]
    );
    const job = result.rows[0];

    job.equity = parseFloat(job.equity);

    return job;
  }

  /** Creates WHERE query from the url query strings
   *
   * Returns SQL WHERE query as a string
   * */

  static _createWhereSqlQueryFilters(
    title = "",
    minSalary = null,
    hasEquity = ""
  ) {
    if (minSalary >= 1000000)
      throw new BadRequestError(
        `Salary exceeds salary limit: Less than $1,000,000`
      );

    const titleSql = `LOWER(title) LIKE '%${title.toLowerCase()}%'`; // WHERE LOWER(title) LIKE '%job%'
    const minSalarySql = `salary >= ${minSalary}`; // WHERE salary >= number
    const hasEquitySql = `equity > 0`; // WHERE equity > 0
    const hasNoEquitySql = `equity = 0`; // WHERE equity = 0
    const allEquitySql = `equity >= 0`; // WHERE equity >= 0

    const queries = [];

    if (title.length > 0) queries.push(titleSql);
    if (minSalary) queries.push(minSalarySql);

    if (hasEquity.length == 0) queries.push(allEquitySql);
    if (hasEquity.toLowerCase() == "true") queries.push(hasEquitySql);
    if (hasEquity.toLowerCase() == "false") queries.push(hasNoEquitySql);

    let queryFilters = "";

    if (queries.length >= 1) {
      queryFilters = "WHERE " + queries.join(" AND ");
    }

    return queryFilters;
  }

  /** Find all jobs.
   *
   * Returns [{ title, salary, equity, companyHandle }, ...]
   * */

  static async findAll(title, minSalary, hasEquity) {
    const queryFilters = this._createWhereSqlQueryFilters(
      title,
      minSalary,
      hasEquity
    );

    const jobsRes = await db.query(
      `SELECT title, salary, equity, company_handle AS "companyHandle"
       FROM jobs
       ${queryFilters}
       `
    );

    return jobsRes.rows;
  }

  /** Given a job, return data about job.
   *
   * Returns { id, title, salary, equity, companyHandle }
   *   where jobs is [{ handle, name, description, numEmployees, logoUrl, jobs }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(title) {
    const jobRes = await db.query(
      `SELECT title, salary, equity, company_handle AS "companyHandle"
       FROM jobs
       WHERE LOWER(title) = $1`,
      [title.toLowerCase()]
    );

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${title}`);

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: { title, salary, equity, companyHandle }
   *
   * Returns { title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   */

  static async update(title, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {
      companyHandle: "company_handle",
    });

    const titleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs
                    SET ${setCols}
                    WHERE LOWER(title) = ${titleVarIdx}
                    RETURNING title,
                              salary,
                              equity,
                              company_handle AS "companyHandle"`;

    const result = await db.query(querySql, [...values, title.toLowerCase()]);

    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${title}`);

    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

  static async remove(title) {
    const result = await db.query(
      `DELETE
         FROM jobs
         WHERE LOWER(title) = $1
         RETURNING title`,
      [title.toLowerCase()]
    );

    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${title}`);
  }
}

module.exports = Job;
