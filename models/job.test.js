"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "Senior Software Engineer",
    salary: 200000,
    equity: 0.5,
    companyHandle: "c1",
  };

  test("create a job", async function () {
    let job = await Job.create(newJob);

    const result = await db.query(
      `SELECT title, salary, equity, company_handle AS "companyHandle"
      FROM jobs
      WHERE title = 'Senior Software Engineer'`
    );

    expect(job).toEqual(newJob);

    expect(result.rows).toEqual([
      {
        title: "Senior Software Engineer",
        salary: 200000,
        equity: 0.5,
        companyHandle: "c1",
      },
    ]);
  });

  test("create a job (failed for duplicates)", async function () {
    try {
      await Job.create(newJob);
      await Job.create(newJob);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });

  test("create a job (failed for invalid equity)", async function () {
    try {
      const job = { ...newJob, equity: 1.1 };
      await Job.create(job);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });

  test("create a job (failed for invalid salary)", async function () {
    try {
      const job = { ...newJob, salary: -1 };
      await Job.create(job);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("findAll jobs (no filters)", async function () {
    const jobs = await Job.findAll();

    expect(jobs).toEqual([
      {
        title: "job1",
        salary: 50000,
        equity: 0,
        companyHandle: "c1",
      },
      {
        title: "job2",
        salary: 100000,
        equity: 1.0,
        companyHandle: "c2",
      },
    ]);
  });
});

/************************************** get */

describe("get", function () {
  test("get a job by title", async function () {
    let job = await Job.get("job1");

    expect(job).toEqual({
      title: "job1",
      salary: 50000,
      equity: 0,
      companyHandle: "c1",
    });
  });

  test("job not found", async function () {
    try {
      await Job.get("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

describe("update", function () {
  const updateJob = {
    title: "DevOps Engineer",
    salary: 175000,
    equity: 0.5,
    companyHandle: "c1",
  };

  test("full update on a job", async function () {
    const job = await Job.update("job1", updateJob);

    expect(job).toEqual(updateJob);

    const result = await db.query(
      `SELECT title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE title = 'DevOps Engineer'`
    );

    expect(result.rows).toEqual([
      {
        title: "DevOps Engineer",
        salary: 175000,
        equity: 0.5,
        companyHandle: "c1",
      },
    ]);
  });

  test("full update on a job (null fields)", async function () {
    const updateJobWithNulls = {
      title: "job3",
      salary: 50000,
      equity: 0.2,
      companyHandle: "c1",
    };

    let job = await Job.update("job1", updateJobWithNulls);

    expect(job).toEqual(updateJobWithNulls);

    const result = await db.query(
      `SELECT title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE title = 'job3'`
    );

    expect(result.rows).toEqual([
      {
        title: "job3",
        salary: 50000,
        equity: 0.2,
        companyHandle: "c1",
      },
    ]);
  });

  test("job not found", async function () {
    try {
      await Job.update("nope", updateJob);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("update job with no data", async function () {
    try {
      await Job.update("job1", {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** delete */

describe("delete", function () {
  test("delete a job by title", async function () {
    let result = await Job.remove("job1");

    expect(result).toEqual(undefined);
  });

  test("job not found", async function () {
    try {
      await Job.get("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
