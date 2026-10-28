Board.find_or_create_by!(slug: "welcome-***REMOVED***") do |board|
  board.name = "Welcome to Inkroom"
  board.creator_nickname = "Inkroom"
  board.last_activity_at = Time.current
end

welcome = Board.find_by!(slug: "welcome-***REMOVED***")

if welcome.strokes.none?
  [
    {
      tool: "pen",
      color: "#0f766e",
      width: 5,
      nickname: "Inkroom",
      points: [
        { "x" => 120, "y" => 160 }, { "x" => 160, "y" => 120 }, { "x" => 220, "y" => 150 },
        { "x" => 280, "y" => 110 }, { "x" => 340, "y" => 170 }, { "x" => 400, "y" => 130 }
      ]
    },
    {
      tool: "ellipse",
      color: "#f59e0b",
      width: 3,
      nickname: "Inkroom",
      points: [{ "x" => 450, "y" => 200 }, { "x" => 620, "y" => 320 }]
    },
    {
      tool: "rect",
      color: "#3b82f6",
      width: 3,
      nickname: "Inkroom",
      points: [{ "x" => 140, "y" => 260 }, { "x" => 320, "y" => 400 }]
    }
  ].each { |attrs| welcome.strokes.create!(attrs) }
end
