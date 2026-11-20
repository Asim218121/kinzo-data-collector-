import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRss} from '../scripts/refresh-news.mjs';
test('RSS source entries become dated links without download authorization',()=>{
 const xml='<rss><channel><item><title>California &amp; snow</title><link>https://example.org/story</link><pubDate>Thu, 19 Nov 2026 10:00:00 GMT</pubDate><source>Example News</source></item></channel></rss>';
 const items=parseRss(xml,'California snow');
 assert.equal(items.length,1);
 assert.equal(items[0].title,'California & snow');
 assert.equal(items[0].publishedAt,'2026-11-19T10:00:00.000Z');
 assert.equal(items[0].recordedAt,null);
 assert.match(items[0].license,/permission/);
});
test('RSS ignores missing and unsafe links',()=>{
 const xml='<rss><item><title>Bad URL</title><link>javascript:alert(1)</link><pubDate>Thu, 19 Nov 2026 10:00:00 GMT</pubDate></item></rss>';
 assert.deepEqual(parseRss(xml,'test'),[]);
});
