module ApplicationHelper
  def page_title(title = nil)
    base = "Inkroom"
    title.present? ? "#{title} · #{base}" : base
  end

  def initials_for(name)
    parts = name.to_s.strip.split(/\s+/)
    return "?" if parts.empty?

    (parts[0][0].to_s + parts[1].to_s[0].to_s).upcase
  end

  def avatar_hue(name)
    (name.to_s.bytes.sum * 37) % 360
  end
end
