import * as templating from '../index';
import * as db from '../../common/database';
import * as models from '../../models';

function assertTemplate (txt, expected) {
  return async function () {
    const result = await templating.render(txt);
    expect(result).toMatch(expected);
  }
}

const isoRe = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
const secondsRe = /^\d{10}$/;
const millisRe = /^\d{13}$/;

describe('TimestampExtension', () => {
  it('renders basic', assertTemplate('{% timestamp %}', millisRe));
});

describe('NowExtension', () => {
  it('renders default ISO', assertTemplate('{% now %}', isoRe));
  it('renders ISO', assertTemplate('{% now "iso" %}', isoRe));
  it('renders seconds', assertTemplate('{% now "seconds" %}', secondsRe));
  it('renders unix', assertTemplate('{% now "unix" %}', secondsRe));
  it('renders millis', assertTemplate('{% now "millis" %}', millisRe));
  it('renders default fallback', assertTemplate('{% now "foo" %}', isoRe));
});

describe('UuidExtension', () => {
  it('renders default v4', assertTemplate('{% uuid %}', 'dd2ccc1a-2745-477a-881a-9e8ef9d42403'));
  it('renders 4', assertTemplate('{% uuid "4" %}', 'e3e96e5f-dd68-4229-8b66-dee1f0940f3d'));
  it('renders 4 num', assertTemplate('{% uuid 4 %}', 'a262d22b-5fa8-491c-9bd9-58fba03e301e'));
  it('renders v4', assertTemplate('{% uuid "v4" %}', '2e7c2688-09ee-44b8-900d-5cbbaa7d3a19'));
  it('renders 1', assertTemplate('{% uuid "1" %}', 'f7272c80-f493-11e6-bc64-92361f002671'));
  it('renders 1 num', assertTemplate('{% uuid 1 %}', 'f7272f0a-f493-11e6-bc64-92361f002671'));
  it('renders v1', assertTemplate('{% uuid "v1" %}', 'f72733a6-f493-11e6-bc64-92361f002671'));
  it('renders default fallback', assertTemplate('{% uuid "foo" %}', 'e7d698c4-c7d2-409c-90c6-22bcc94ba4ab'));
});

describe('ResponseJsonPathExtension', async () => {
  beforeEach(() => db.init(models.types(), {inMemoryOnly: true}, true));

  it('renders basic JSONPath query', async () => {
    // Create request and response
    const request = await models.request.create({parentId: 'foo'});
    await models.response.create({
        parentId: request._id,
        body: '{"foo": "bar"}',
        encoding: 'utf8',
      }
    );

    // Render the template
    const result = await templating.render(
      `{% res_jsonpath "${request._id}", "$.foo" %}`
    );

    // Assert
    expect(result).toBe('bar');
  })
});
