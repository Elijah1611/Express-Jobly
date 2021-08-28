"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  adminToken,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    title: "job3",
    salary: 50000,
    equity: 0.2,
    companyHandle: "c1",
  };

  test("post: create new job with admin token", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${adminToken}`);

    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: newJob,
    });
  });

  test("post: create new job with non admin token", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u1Token}`);

    expect(resp.statusCode).toEqual(401);
  });

  test("post: create new job with no token", async function () {
    const resp = await request(app).post("/jobs").send(newJob);

    expect(resp.statusCode).toEqual(401);
  });

  test("post: create job with missing data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        title: "job3",
        salary: 55000,
      })
      .set("authorization", `Bearer ${adminToken}`);

    expect(resp.statusCode).toEqual(400);
  });

  test("post: create job with invaild data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        ...newJob,
        equity: 1.1,
      })
      .set("authorization", `Bearer ${adminToken}`);

    expect(resp.statusCode).toEqual(400);
  });
});

// /************************************** GET /jobs */

describe("GET /jobs", function () {
  test("get: fetch all jobs", async function () {
    const resp = await request(app).get("/jobs");

    expect(resp.body).toEqual({
      jobs: [
        {
          title: "job1",
          salary: 50000,
          equity: 0,
          companyHandle: "c1",
        },
        {
          title: "job2",
          salary: 175000,
          equity: 1.0,
          companyHandle: "c2",
        },
        {
          title: "Engineer",
          salary: 200000,
          equity: 0.75,
          companyHandle: "c3",
        },
      ],
    });
  });

  test("get: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right

    await db.query("DROP TABLE jobs CASCADE");

    const resp = await request(app)
      .get("/jobs")
      .set("authorization", `Bearer ${u1Token}`);

    expect(resp.statusCode).toEqual(500);
  });
});

// /************************************** GET /jobs with title, minSalary, hasEquity */

describe("GET /jobs with query filters", function () {
  test("get: fetch jobs with queries (title)", async function () {
    const resp = await request(app).get("/jobs").query({ title: "Engineer" });

    expect(resp.body).toEqual({
      jobs: [
        {
          title: "Engineer",
          salary: 200000,
          equity: 0.75,
          companyHandle: "c3",
        },
      ],
    });
  });

  test("get: fetch jobs with queries", async function () {
    const resp = await request(app)
      .get("/jobs")
      .query({ title: "job", minSalary: 50001, equity: true });

    expect(resp.body).toEqual({
      jobs: [
        {
          title: "job2",
          salary: 175000,
          equity: 1.0,
          companyHandle: "c2",
        },
      ],
    });
  });

  test("get: fetch jobs with queries (hasEquity: true)", async function () {
    const resp = await request(app).get("/jobs").query({ hasEquity: true });

    expect(resp.body).toEqual({
      jobs: [
        {
          title: "job2",
          salary: 175000,
          equity: 1.0,
          companyHandle: "c2",
        },
        {
          title: "Engineer",
          salary: 200000,
          equity: 0.75,
          companyHandle: "c3",
        },
      ],
    });
  });

  test("get: fetch jobs with queries (hasEquity: false)", async function () {
    const resp = await request(app).get("/jobs").query({ hasEquity: false });

    expect(resp.body).toEqual({
      jobs: [
        {
          title: "job1",
          salary: 50000,
          equity: 0,
          companyHandle: "c1",
        },
      ],
    });
  });

  test("get: fetch jobs with queries (hasEquity not passed)", async function () {
    const resp = await request(app).get("/jobs");

    expect(resp.body).toEqual({
      jobs: [
        {
          title: "job1",
          salary: 50000,
          equity: 0,
          companyHandle: "c1",
        },
        {
          title: "job2",
          salary: 175000,
          equity: 1.0,
          companyHandle: "c2",
        },
        {
          title: "Engineer",
          salary: 200000,
          equity: 0.75,
          companyHandle: "c3",
        },
      ],
    });
  });

  test("get: fetch jobs with queries (minSalary)", async function () {
    const resp = await request(app).get("/jobs").query({ minSalary: 200000 });

    expect(resp.body).toEqual({
      jobs: [
        {
          title: "Engineer",
          salary: 200000,
          equity: 0.75,
          companyHandle: "c3",
        },
      ],
    });
  });

  test("get: fetch jobs with queries (exceed salary)", async function () {
    const resp = await request(app).get("/jobs").query({ minSalary: 1000000 });

    expect(resp.statusCode).toEqual(400);
  });
});

// /************************************** GET /jobs/:title */

describe("GET /jobs/:title", function () {
  test("get: fetch a job with title", async function () {
    const resp = await request(app).get(`/jobs/job1`);

    expect(resp.body).toEqual({
      job: {
        title: "job1",
        salary: 50000,
        equity: 0,
        companyHandle: "c1",
      },
    });

    expect(resp.statusCode).toEqual(200);
  });

  test("get: job not found 404", async function () {
    const resp = await request(app).get(`/jobs/nope`);

    expect(resp.statusCode).toEqual(404);
  });
});

// /************************************** PATCH /jobs/:title */

describe("PATCH /jobs/:title", function () {
  test("patch: update job with admin token", async function () {
    const resp = await request(app)
      .patch(`/jobs/job1`)
      .send({
        salary: 59000,
      })
      .set("authorization", `Bearer ${adminToken}`);

    expect(resp.body).toEqual({
      job: {
        title: "job1",
        salary: 59000,
        equity: 0,
        companyHandle: "c1",
      },
    });
  });

  test("patch: update job title with admin token", async function () {
    const resp = await request(app)
      .patch(`/jobs/job1`)
      .send({
        title: "job100",
      })
      .set("authorization", `Bearer ${adminToken}`);

    expect(resp.body).toEqual({
      job: {
        title: "job100",
        salary: 50000,
        equity: 0,
        companyHandle: "c1",
      },
    });
  });

  test("patch: update job company handle with admin token", async function () {
    const resp = await request(app)
      .patch(`/jobs/job1`)
      .send({
        companyHandle: "c2",
      })
      .set("authorization", `Bearer ${adminToken}`);

    expect(resp.body).toEqual({
      job: {
        title: "job1",
        salary: 50000,
        equity: 0,
        companyHandle: "c2",
      },
    });
  });

  test("patch: update job with non admin token", async function () {
    const resp = await request(app)
      .patch(`/jobs/job1`)
      .send({
        salary: 59000,
      })
      .set("authorization", `Bearer ${u1Token}`);

    expect(resp.statusCode).toEqual(401);
  });

  test("patch: update job with no token", async function () {
    const resp = await request(app).patch(`/jobs/job1`).send({
      salary: 59000,
    });

    expect(resp.statusCode).toEqual(401);
  });

  test("patch: jobs not found 404", async function () {
    const resp = await request(app)
      .patch(`/jobs/nope`)
      .send({
        salary: 59000,
      })
      .set("authorization", `Bearer ${adminToken}`);

    expect(resp.statusCode).toEqual(404);
  });

  test("patch: 400 bad request on exceeding max salary", async function () {
    const resp = await request(app)
      .patch(`/jobs/job1`)
      .send({
        salary: 50000000,
      })
      .set("authorization", `Bearer ${adminToken}`);

    expect(resp.statusCode).toEqual(400);
  });

  test("patch: 400 bad request on exceeding max equity", async function () {
    const resp = await request(app)
      .patch(`/jobs/job1`)
      .send({
        equity: 1.1,
      })
      .set("authorization", `Bearer ${adminToken}`);

    expect(resp.statusCode).toEqual(400);
  });
});

// /************************************** DELETE /jobs/:handle */

describe("DELETE /jobs/:handle", function () {
  test("delete: job with admin token", async function () {
    const resp = await request(app)
      .delete(`/jobs/job1`)
      .set("authorization", `Bearer ${adminToken}`);

    expect(resp.body).toEqual({ deleted: "job1" });
  });

  test("delete: job with non admin token", async function () {
    const resp = await request(app)
      .delete(`/jobs/job1`)
      .set("authorization", `Bearer ${u1Token}`);

    expect(resp.statusCode).toEqual(401);
  });

  test("delete: job with no token", async function () {
    const resp = await request(app).delete(`/jobs/job1`);

    expect(resp.statusCode).toEqual(401);
  });

  test("delete: job not found 404", async function () {
    const resp = await request(app)
      .delete(`/jobs/nope`)
      .set("authorization", `Bearer ${adminToken}`);

    expect(resp.statusCode).toEqual(404);
  });
});
