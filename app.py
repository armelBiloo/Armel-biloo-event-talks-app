import datetime
import io
import csv
import re
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request, Response

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
FALLBACK_FEED_URL = "https://cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache for feed data
cache = {
    "data": None,
    "last_fetched": None,
    "feed_title": "BigQuery Release Notes",
    "status": "idle"
}

def clean_and_absolute_links(soup_obj):
    """Ensure all links inside HTML soup open in new tab and have absolute URLs."""
    for a in soup_obj.find_all('a'):
        href = a.get('href', '')
        if href.startswith('/'):
            a['href'] = f"https://cloud.google.com{href}"
        a['target'] = '_blank'
        a['rel'] = 'noopener noreferrer'
    return soup_obj

def get_xml_elem(parent, tag_name, ns):
    """Safely find XML element checking is not None rather than truthiness."""
    elem = parent.find(f'atom:{tag_name}', ns)
    if elem is not None:
        return elem
    return parent.find(tag_name)

def fetch_feed_data(force=False):
    """Fetch and parse Atom XML feed from Google Cloud BigQuery release notes."""
    global cache
    
    now = datetime.datetime.now(datetime.timezone.utc)
    if not force and cache["data"] is not None and cache["last_fetched"] is not None:
        elapsed = (now - cache["last_fetched"]).total_seconds()
        if elapsed < 600:  # 10 minutes cache
            return cache["data"]

    urls_to_try = [FEED_URL, FALLBACK_FEED_URL]
    xml_content = None
    last_error = None

    for url in urls_to_try:
        try:
            req = urllib.request.Request(
                url, 
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BigQueryReleaseNotesApp/1.0'}
            )
            with urllib.request.urlopen(req, timeout=12) as response:
                xml_content = response.read()
                if xml_content:
                    break
        except Exception as e:
            last_error = str(e)
            continue

    if not xml_content:
        if cache["data"] is not None:
            return cache["data"]
        raise RuntimeError(f"Unable to fetch release notes feed: {last_error}")

    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as pe:
        raise RuntimeError(f"XML Parse error: {pe}")

    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    feed_title_elem = get_xml_elem(root, 'title', ns)
    feed_title = feed_title_elem.text if feed_title_elem is not None else "BigQuery Release Notes"

    entries = root.findall('atom:entry', ns)
    if not entries:
        entries = root.findall('entry')

    parsed_entries = []
    total_items_count = 0
    category_counts = {
        "Feature": 0,
        "Announcement": 0,
        "Change": 0,
        "Issue": 0,
        "Security": 0,
        "General": 0
    }

    for entry_idx, entry in enumerate(entries):
        title_elem = get_xml_elem(entry, 'title', ns)
        updated_elem = get_xml_elem(entry, 'updated', ns)
        link_elem = get_xml_elem(entry, 'link', ns)
        id_elem = get_xml_elem(entry, 'id', ns)
        content_elem = get_xml_elem(entry, 'content', ns)

        date_str = title_elem.text.strip() if title_elem is not None and title_elem.text else "Unknown Date"
        updated_iso = updated_elem.text.strip() if updated_elem is not None and updated_elem.text else ""
        
        entry_link = "https://cloud.google.com/bigquery/docs/release-notes"
        if link_elem is not None and 'href' in link_elem.attrib:
            entry_link = link_elem.attrib['href']

        entry_id = id_elem.text.strip() if id_elem is not None and id_elem.text else f"entry-{entry_idx}"
        content_html = content_elem.text if content_elem is not None and content_elem.text else ""

        soup = BeautifulSoup(content_html, 'html.parser')
        soup = clean_and_absolute_links(soup)

        headers = soup.find_all(['h3', 'h2', 'h4'])
        items = []

        if headers:
            for h_idx, h in enumerate(headers):
                cat_raw = h.get_text().strip()
                cat_clean = cat_raw if cat_raw in category_counts else "General"
                
                sibling_html_parts = []
                curr = h.next_sibling
                while curr and curr.name not in ['h2', 'h3', 'h4']:
                    sibling_html_parts.append(str(curr))
                    curr = curr.next_sibling
                
                item_html = "".join(sibling_html_parts).strip()
                item_soup = BeautifulSoup(item_html, 'html.parser')
                item_text = item_soup.get_text().strip()
                
                item_text_clean = re.sub(r'\s+', ' ', item_text)
                
                sentences = re.split(r'(?<=[.!?]) +', item_text_clean)
                summary = sentences[0] if sentences else item_text_clean
                if len(summary) > 200:
                    summary = summary[:197] + "..."

                item_id = f"{entry_id}-item-{h_idx}"
                
                tweet_impact = f"🚀 BigQuery {cat_clean} ({date_str}): {summary}\n\nDetails: {entry_link}\n\n#BigQuery #GoogleCloud #DataEngineering"
                tweet_quick = f"New BigQuery Update: {summary}\n🔗 {entry_link} #BigQuery #GCP"

                category_counts[cat_clean] = category_counts.get(cat_clean, 0) + 1
                total_items_count += 1

                items.append({
                    "id": item_id,
                    "category": cat_clean,
                    "raw_category": cat_raw,
                    "html": item_html,
                    "text": item_text_clean,
                    "summary": summary,
                    "tweets": {
                        "impact": tweet_impact,
                        "quick": tweet_quick
                    }
                })
        else:
            item_text_clean = re.sub(r'\s+', ' ', soup.get_text().strip())
            summary = item_text_clean.split('. ')[0] if item_text_clean else ""
            if len(summary) > 200:
                summary = summary[:197] + "..."
                
            item_id = f"{entry_id}-item-0"
            cat_clean = "General"
            category_counts["General"] += 1
            total_items_count += 1

            items.append({
                "id": item_id,
                "category": cat_clean,
                "raw_category": cat_clean,
                "html": str(soup),
                "text": item_text_clean,
                "summary": summary,
                "tweets": {
                    "impact": f"🚀 BigQuery Update ({date_str}): {summary}\n\n{entry_link} #BigQuery #GoogleCloud",
                    "quick": f"BigQuery Update: {summary}\n🔗 {entry_link} #BigQuery"
                }
            })

        parsed_entries.append({
            "entry_id": entry_id,
            "date": date_str,
            "updated": updated_iso,
            "link": entry_link,
            "items": items
        })

    result_payload = {
        "title": feed_title,
        "feed_url": FEED_URL,
        "last_refreshed_at": now.strftime("%b %d, %Y %H:%M:%S UTC"),
        "last_refreshed_iso": now.isoformat(),
        "total_entries": len(parsed_entries),
        "total_items": total_items_count,
        "category_counts": category_counts,
        "entries": parsed_entries
    }

    cache["data"] = result_payload
    cache["last_fetched"] = now
    cache["feed_title"] = feed_title
    cache["status"] = "success"

    return result_payload

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes', methods=['GET'])
def get_notes():
    force_refresh = request.args.get('refresh', 'false').lower() in ['true', '1', 'yes']
    try:
        data = fetch_feed_data(force=force_refresh)
        return jsonify({"success": True, "data": data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/notes/export/csv', methods=['GET'])
def export_csv():
    """Export all release notes to a CSV file with UTF-8 BOM encoding."""
    try:
        data = fetch_feed_data(force=False)
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
        writer.writerow(['Date', 'Category', 'Summary', 'Full_Text', 'Documentation_Link', 'Update_ID'])
        
        for entry in data.get('entries', []):
            date_str = entry.get('date', '')
            link = entry.get('link', '')
            for item in entry.get('items', []):
                writer.writerow([
                    date_str,
                    item.get('category', ''),
                    item.get('summary', ''),
                    item.get('text', ''),
                    link,
                    item.get('id', '')
                ])
                
        csv_data = output.getvalue()
        today_str = datetime.datetime.now().strftime("%Y-%m-%d")
        
        return Response(
            '\ufeff' + csv_data,
            mimetype='text/csv; charset=utf-8',
            headers={"Content-Disposition": f"attachment; filename=bigquery-release-notes-{today_str}.csv"}
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/tweet/intent', methods=['POST'])
def generate_tweet_intent():
    req_data = request.get_json() or {}
    text = req_data.get('text', '').strip()
    hashtags = req_data.get('hashtags', [])
    url = req_data.get('url', 'https://cloud.google.com/bigquery/docs/release-notes')

    if not text:
        return jsonify({"success": False, "error": "Tweet text cannot be empty"}), 400

    full_tweet = text
    if hashtags:
        tags_str = " ".join([f"#{t.strip('#')}" for t in hashtags if t.strip()])
        if tags_str and tags_str not in full_tweet:
            full_tweet = f"{full_tweet}\n\n{tags_str}"

    encoded_text = urllib.parse.quote(full_tweet)
    intent_url = f"https://twitter.com/intent/tweet?text={encoded_text}"
    x_intent_url = f"https://x.com/intent/tweet?text={encoded_text}"

    return jsonify({
        "success": True,
        "tweet_text": full_tweet,
        "character_count": len(full_tweet),
        "is_over_limit": len(full_tweet) > 280,
        "intent_url": intent_url,
        "x_intent_url": x_intent_url
    })

if __name__ == '__main__':
    try:
        fetch_feed_data(force=True)
        print("Initial feed fetch successful!")
    except Exception as err:
        print(f"Initial feed fetch error: {err}")
    app.run(host='127.0.0.1', port=5000, debug=True)
