import re

def parse_query(query: str) -> str:
    """
    Parses admin query to extract helpful info and normalize.
    """
    clean_query = query.strip()
    return clean_query

def get_url_search_formatted_query(query: str, separator: str = "+") -> str:
    """
    Formats the query to be url safe based on a separator.
    """
    return re.sub(r'\s+', separator, query.strip())
